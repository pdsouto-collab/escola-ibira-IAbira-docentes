import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sessions = await prisma.pedagogicalSession.findMany({
      where: {
        status: 'AGUARDANDO_DIRETORIA',
      },
      include: {
        educador: true,
        finalContent: true,
        classifications: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Formata o retorno para a tela
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      educator: session.educador.nome,
      theme: session.tema || 'Vivência na Natureza',
      status: session.status,
      date: new Date(session.updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      content: session.finalContent?.content || '',
      requiresDirectorApproval: session.requiresDirectorApproval,
      classifications: session.classifications.map(c => ({ year: c.year, subcategory: c.subcategory }))
    }));

    return NextResponse.json(formattedSessions);
  } catch (error: any) {
    console.error('Failed to list sessions:', error);
    return NextResponse.json({ error: error.message || 'Failed to list sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sessionId, action, feedbackText } = await req.json().catch(() => ({}));

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Session ID and Action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'feedback') {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "feedback"' }, { status: 400 });
    }

    if (action === 'approve') {
      await prisma.pedagogicalSession.update({
        where: { id: sessionId },
        data: {
          status: 'APROVADO',
          requiresDirectorApproval: false,
        },
      });
    } else if (action === 'feedback') {
      await prisma.pedagogicalSession.update({
        where: { id: sessionId },
        data: {
          status: 'BRIEFING', // Retorna para briefing/educador para que ele mude com o Escutador
          directorFeedback: feedbackText || '',
          requiresDirectorApproval: false,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: error.message || 'Failed to update session' }, { status: 500 });
  }
}
