import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const ragContext = `Diretrizes da Escola Ibirá: Foco em autonomia, contato com a natureza e materiais não estruturados.
BNCC: Campos de experiência 'O eu, o outro e o nós', 'Traços, sons, cores e formas'.`;

    const combinedPrompt = `Você é o assistente pedagógico da Escola Ibirá.
Com base no briefing do educador e no contexto pedagógico (RAG) fornecidos abaixo, crie uma proposta de vivência sensorial na natureza de alta qualidade.

A proposta deve ser muito detalhada e dividida estritamente nas seguintes seções em Markdown:
1. Preparação do Espaço Natural
2. Roda de Investigação
3. Vivência Livre
4. Registro Coletivo

Foque em experiências sensoriais, autonomia da criança (abordagem Pikler/Antroposófica) e livre exploração. Substitua quaisquer atividades tradicionais ou estruturadas (como folhas de colorir) por exploração e brincadeira livre com materiais não estruturados.
Ao final do documento, de forma natural, adicione e liste os códigos e campos de experiência da BNCC (Educação Infantil) adequados para esta vivência.

Contexto Pedagógico (RAG):
${ragContext}

Briefing da Educadora:
${briefingContext}`;

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
                  connectOrCreate: {
                    where: { email: 'mock@ibira.com' },
                    create: { nome: 'Mock Educador', email: 'mock@ibira.com', role: 'EDUCADOR' }
                  }
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
