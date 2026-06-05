import { anthropic } from '@ai-sdk/anthropic';
import { streamText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export const maxDuration = 60;

// Helper to run database operations with a timeout
async function runWithTimeout(promise: Promise<any>, timeoutMs: number) {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, chatHistory } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Coletar o contexto do Escutador (Chat)
    let briefingContext = '';
    if (chatHistory && Array.isArray(chatHistory)) {
      briefingContext = chatHistory
        .map((msg: any) => `${msg.role === 'user' ? 'Educador' : 'Escutador'}: ${msg.content}`)
        .join('\n\n');
    }

    // Fallback: Se não foi enviado histórico no body, tenta buscar do banco de dados
    if (!briefingContext) {
      try {
        const session = await prisma.pedagogicalSession.findUnique({
          where: { id: sessionId },
          include: { agentLogs: true }
        });
        
        if (session) {
          briefingContext = session.agentLogs
            .filter((log: any) => log.agentName === 'ESCUTADOR')
            .map((log: any) => `Educador: ${log.input}\nEscutador: ${log.output}`)
            .join('\n\n');
        }
      } catch (dbError) {
        console.error('Failed to retrieve session from database in orchestrator:', dbError);
      }
    }

    // Se o briefing ainda estiver vazio, usa um fallback explicativo para o modelo
    if (!briefingContext) {
      briefingContext = 'Educador deseja iniciar uma vivência sensorial rica focada nos elementos da natureza.';
    }

    // === ORQUESTRADOR DE AGENTES (Fusão das chamadas Criador & Revisor via Stream) ===
    let ragContext = `Diretrizes da Escola Ibirá: Foco em autonomia, contato com a natureza e materiais não estruturados.
BNCC: Campos de experiência 'O eu, o outro e o nós', 'Traços, sons, cores e formas'.`;

    try {
      // 1. Gerar o vetor do briefing
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: briefingContext.slice(0, 3000), // Prevenir tamanho excessivo
      });

      // 2. Buscar no pgvector do PostgreSQL
      const similarDocs = await prisma.$queryRaw<any[]>`
        SELECT content, metadata
        FROM "KnowledgeBaseEmbedding"
        ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
        LIMIT 4
      `;

      if (similarDocs && similarDocs.length > 0) {
        ragContext = similarDocs
          .map(doc => `[Metodologia: ${doc.metadata}]\n${doc.content}`)
          .join('\n\n---\n\n');
      }
    } catch (ragError) {
      console.warn("Aviso: Falha ao executar busca RAG vetorial no banco. Usando fallback.", ragError);
    }

    // Carregar prompt do Criador do banco
    let combinedPrompt = '';
    const defaultCriadorPrompt = `Você é o assistente pedagógico da Escola Ibirá.
Com base no briefing do educador e no contexto pedagógico (RAG) fornecidos abaixo, crie uma proposta de vivência sensorial na natureza de alta qualidade.

A proposta deve ser muito detalhada e dividida estritamente nas seguintes seções em Markdown:
1. Preparação do Espaço Natural
2. Roda de Investigação
3. Vivência Livre
4. Registro Coletivo

Foque em experiências sensoriais, autonomia da criança (abordagem Pikler/Antroposófica) e livre exploração. Substitua quaisquer atividades tradicionais ou estruturadas (como folhas de colorir) por exploração e brincadeira livre com materiais não estruturados.
Ao final do documento, de forma natural, adicione e liste os códigos e campos de experiência da BNCC (Educação Infantil) adequados para esta vivência.

Contexto Pedagógico (RAG):
{{RAG}}

Briefing da Educadora:
{{BRIEFING}}`;

    let activePromptTemplate = defaultCriadorPrompt;

    try {
      const config = await prisma.agentConfig.findUnique({
        where: { agentName: 'CRIADOR' }
      });
      if (config?.instructions) {
        activePromptTemplate = config.instructions;
      }
    } catch (error) {
      console.warn("Aviso: Falha ao buscar instruções do Criador no banco, utilizando padrão.", error);
    }

    // Processar placeholders
    let tempPrompt = activePromptTemplate;
    if (tempPrompt.includes('{{RAG}}') || tempPrompt.includes('{{rag}}')) {
      tempPrompt = tempPrompt.replace(/\{\{RAG\}\}/gi, ragContext);
    } else {
      tempPrompt = tempPrompt + `\n\nContexto Pedagógico (RAG):\n${ragContext}`;
    }

    if (tempPrompt.includes('{{BRIEFING}}') || tempPrompt.includes('{{briefing}}')) {
      tempPrompt = tempPrompt.replace(/\{\{BRIEFING\}\}/gi, briefingContext);
    } else {
      tempPrompt = tempPrompt + `\n\nBriefing da Educadora:\n${briefingContext}`;
    }

    let userPrefContext = '';
    try {
      const userPref = await prisma.userPreference.findUnique({
        where: { userId: user.id }
      });
      if (userPref?.preferences) {
        userPrefContext = `\n\n[DIRETRIZES PERSONALIZADAS E PREFERÊNCIAS DO EDUCADOR - MEMÓRIA DO AGENTE]:\nAo criar a proposta, atenda rigorosamente a estas preferências históricas do educador:\n${userPref.preferences}\n\n`;
      }
    } catch (prefError) {
      console.warn("Aviso: Falha ao carregar preferências no orquestrador:", prefError);
    }

    combinedPrompt = userPrefContext + tempPrompt;

    const result = await streamText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: combinedPrompt,
      onFinish: async ({ text }) => {
        // Gravar logs e dados finais no banco de dados de forma resiliente após o fim do stream
        try {
          await runWithTimeout((async () => {
            // Garante que a PedagogicalSession existe no banco de dados
            await prisma.pedagogicalSession.upsert({
              where: { id: sessionId },
              create: { 
                id: sessionId, 
                status: "GERADO",
                educador: {
                  connect: { email: user.email }
                }
              },
              update: {}
            });

            // Salva o log do Criador
            await prisma.agentLog.create({
              data: {
                sessionId,
                agentName: 'CRIADOR',
                input: briefingContext,
                output: text,
              }
            });

            // Salva o log do Revisor (compartilha o mesmo output na arquitetura unificada)
            await prisma.agentLog.create({
              data: {
                sessionId,
                agentName: 'REVISOR',
                input: text,
                output: text,
              }
            });

            // Determinar aprovação da diretoria
            const requiresDirectorApproval = text.toLowerCase().includes('projeto');

            await prisma.pedagogicalSession.update({
              where: { id: sessionId },
              data: { 
                status: requiresDirectorApproval ? 'AGUARDANDO_DIRETORIA' : 'REVISADO',
                requiresDirectorApproval
              }
            });

            // Salva o conteúdo revisado final
            await prisma.finalContent.upsert({
              where: { sessionId },
              create: {
                sessionId,
                content: text,
                version: 1
              },
              update: {
                content: text,
                version: { increment: 1 }
              }
            });
          })(), 2000); // 2 segundos de timeout
        } catch (dbError) {
          console.error('Database operations timed out or failed in orchestrator onFinish:', dbError);
        }
      }
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error('Orchestration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to orchestrate agents' }, { status: 500 });
  }
}
