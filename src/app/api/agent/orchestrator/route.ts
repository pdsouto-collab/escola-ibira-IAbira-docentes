import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const session = await prisma.pedagogicalSession.findUnique({
      where: { id: sessionId },
      include: { agentLogs: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Coletar o contexto do Escutador
    const briefingContext = session.agentLogs
      .filter((log: any) => log.agentName === 'ESCUTADOR')
      .map((log: any) => `Educador: ${log.input}\nEscutador: ${log.output}`)
      .join('\n\n');

    // === PASSO 1: O CRIADOR (RAG & Cocriação) ===
    // Mock do RAG: No futuro, faremos uma query no Neon com pgvector
    // const knowledge = await prisma.$queryRaw`SELECT content FROM "KnowledgeBaseEmbedding" ORDER BY embedding <-> ${vector} LIMIT 3`;
    const ragContext = `Diretrizes da Escola Ibirá: Foco em autonomia, contato com a natureza e materiais não estruturados.
BNCC: Campos de experiência 'O eu, o outro e o nós', 'Traços, sons, cores e formas'.`;

    const creatorPrompt = `Você é "O Criador", um agente focado em desenhar vivências sensoriais baseadas na natureza.
Utilize o briefing abaixo e o contexto pedagógico para criar uma proposta de Vivência rica.

Contexto Pedagógico (RAG):
${ragContext}

Briefing da Educadora:
${briefingContext}

Gere uma proposta dividida estritamente nas seguintes seções (use Markdown):
1. Preparação do Espaço Natural
2. Roda de Investigação
3. Vivência Livre
4. Registro Coletivo

Foque em experiências sensoriais, não gere planilhas ou atividades tradicionais escolares.`;

    const creatorResult = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: creatorPrompt,
    });

    await prisma.agentLog.create({
      data: {
        sessionId,
        agentName: 'CRIADOR',
        input: briefingContext,
        output: creatorResult.text,
      }
    });

    // === PASSO 2: O REVISOR (Alinhamento Técnico) ===
    const reviewerPrompt = `Você é "O Revisor", um crítico pedagógico rigoroso da Escola Ibirá.
Sua função é revisar a vivência proposta pelo Criador e garantir alinhamento total com a autonomia da criança e a BNCC.
Se houver atividades prontas (como folhas de colorir), substitua por exploração livre.
Injete as tags/códigos da BNCC adequados para a Educação Infantil de forma natural ao final do documento.

Proposta Original do Criador:
${creatorResult.text}

Retorne apenas a proposta final polida em Markdown.`;

    const reviewerResult = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: reviewerPrompt,
    });

    await prisma.agentLog.create({
      data: {
        sessionId,
        agentName: 'REVISOR',
        input: creatorResult.text,
        output: reviewerResult.text,
      }
    });

    // Determinar se requer aprovação da diretoria (Lógica mock baseada no texto, ou sempre true para projetos grandes)
    const requiresDirectorApproval = reviewerResult.text.toLowerCase().includes('projeto') || session.requiresDirectorApproval;

    await prisma.pedagogicalSession.update({
      where: { id: sessionId },
      data: { 
        status: requiresDirectorApproval ? 'AGUARDANDO_DIRETORIA' : 'REVISADO',
        requiresDirectorApproval
      }
    });

    await prisma.finalContent.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content: reviewerResult.text,
        version: 1
      },
      update: {
        content: reviewerResult.text,
        version: { increment: 1 }
      }
    });

    return NextResponse.json({ 
      success: true, 
      content: reviewerResult.text,
      status: requiresDirectorApproval ? 'AGUARDANDO_DIRETORIA' : 'REVISADO'
    });

  } catch (error) {
    console.error('Orchestration error:', error);
    return NextResponse.json({ error: 'Failed to orchestrate agents' }, { status: 500 });
  }
}
