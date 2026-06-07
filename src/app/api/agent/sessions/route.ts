import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      // Busca uma sessão específica com todo o seu histórico e conteúdo
      const session = await prisma.pedagogicalSession.findUnique({
        where: { id },
        include: {
          finalContent: true,
          classifications: true,
          agentLogs: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!session) {
        return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
      }

      // Valida se a sessão pertence ao usuário logado
      if (session.educadorId !== user.id) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }

      return NextResponse.json({ session });
    } else {
      // Lista todas as sessões do usuário autenticado
      const sessions = await prisma.pedagogicalSession.findMany({
        where: { educadorId: user.id },
        include: {
          classifications: true,
          finalContent: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      return NextResponse.json({ sessions });
    }
  } catch (error: any) {
    console.error('Erro na API de sessões:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar sessões' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 });
  }

  try {
    const session = await prisma.pedagogicalSession.findUnique({
      where: { id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    if (session.educadorId !== user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Exclui a sessão (relacionamentos Cascade configurados no Prisma deletam finalContent, classifications, feedbacks, agentLogs)
    await prisma.pedagogicalSession.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar sessão:', error);
    return NextResponse.json({ error: error.message || 'Erro ao deletar sessão' }, { status: 500 });
  }
}
