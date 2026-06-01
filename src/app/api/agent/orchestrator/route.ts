import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 60;

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

    // === ORQUESTRADOR DE AGENTES (Fusão das chamadas Criador & Revisor) ===
    const ragContext = `Diretrizes da Escola Ibirá: Foco em autonomia, contato com a natureza e materiais não estruturados.
BNCC: Campos de experiência 'O eu, o outro e o nós', 'Traços, sons, cores e formas'.`;

    const combinedPrompt = `Você atuará sequencialmente como dois agentes pedagógicos da Escola Ibirá: "O Criador" e "O Revisor".

Etapa 1 - O Criador: Desenha uma vivência sensorial rica baseada na natureza, usando o briefing abaixo. A proposta deve ser dividida estritamente nas seguintes seções:
1. Preparação do Espaço Natural
2. Roda de Investigação
3. Vivência Livre
4. Registro Coletivo
Foque em experiências sensoriais, autonomia da criança (abordagem Pikler/Antroposófica) e livre exploração (evite atividades escolares tradicionais, folhas prontas de colorir, etc.).

Etapa 2 - O Revisor: Revisa a proposta do Criador para garantir alinhamento técnico e pedagógico com a Escola Ibirá e a BNCC. Caso encontre elementos estruturados demais, substitua por exploração e brincadeira livre. No final da proposta revisada, injete as tags/códigos de campos de experiência da BNCC (Educação Infantil) de forma orgânica.

Contexto Pedagógico (RAG):
${ragContext}

Briefing da Educadora:
${briefingContext}

INSTRUÇÃO CRÍTICA DE FORMATAÇÃO:
Você deve retornar a sua resposta EXATAMENTE no formato delimitado abaixo. Não inclua nenhum texto introdutório antes de "=== CRIADOR ===" nem texto conclusivo após "=== REVISOR ===".

=== CRIADOR ===
[Escreva aqui apenas o texto da proposta inicial gerada pelo Criador]

=== REVISOR ===
[Escreva aqui apenas o texto final revisado e polido pelo Revisor, incluindo as tags da BNCC no final]`;

    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: combinedPrompt,
    });

    const textOutput = result.text;
    const parts = textOutput.split('=== REVISOR ===');
    let creatorContent = '';
    let reviewerContent = '';

    if (parts.length >= 2) {
      reviewerContent = parts[1].trim();
      const creatorPart = parts[0].split('=== CRIADOR ===');
      creatorContent = (creatorPart.length >= 2 ? creatorPart[1] : creatorPart[0]).trim();
    } else {
      // Fallback robusto se o modelo não seguir o formato dos delimitadores
      reviewerContent = textOutput.replace(/=== CRIADOR ===|=== REVISOR ===/g, '').trim();
      creatorContent = reviewerContent;
    }

    // Salvar logs e dados finais no banco de dados de forma resiliente
    let requiresDirectorApproval = false;
    try {
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
          output: creatorContent,
        }
      });

      // Salva o log do Revisor
      await prisma.agentLog.create({
        data: {
          sessionId,
          agentName: 'REVISOR',
          input: creatorContent,
          output: reviewerContent,
        }
      });

      // Determinar aprovação da diretoria
      requiresDirectorApproval = reviewerContent.toLowerCase().includes('projeto');

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
          content: reviewerContent,
          version: 1
        },
        update: {
          content: reviewerContent,
          version: { increment: 1 }
        }
      });
    } catch (dbError) {
      console.error('Database operations failed in orchestrator, proceeding anyway:', dbError);
    }

    // Retorna a proposta do revisor com sucesso para a interface
    return NextResponse.json({ 
      success: true, 
      content: reviewerContent,
      status: requiresDirectorApproval ? 'AGUARDANDO_DIRETORIA' : 'REVISADO'
    });

  } catch (error: any) {
    console.error('Orchestration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to orchestrate agents' }, { status: 500 });
  }
}
