import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  try {
    const { sessionId, content, action, tema, classifications } = await req.json().catch(() => ({}));

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Session ID and Content are required' }, { status: 400 });
    }

    if (action !== 'draft' && action !== 'approve') {
      return NextResponse.json({ error: 'Invalid action. Must be "draft" or "approve"' }, { status: 400 });
    }

    // Garante que a PedagogicalSession existe no banco de dados e atualiza o tema
    await prisma.pedagogicalSession.upsert({
      where: { id: sessionId },
      create: { 
        id: sessionId, 
        status: action === 'approve' ? 'AGUARDANDO_DIRETORIA' : 'GERADO',
        tema: tema || 'Vivência na Natureza',
        educador: {
          connect: { email: user.email }
        }
      },
      update: action === 'approve' ? {
        status: 'AGUARDANDO_DIRETORIA',
        requiresDirectorApproval: true,
        tema: tema || 'Vivência na Natureza'
      } : {
        status: 'GERADO',
        tema: tema || 'Vivência na Natureza'
      }
    });

    // Salva ou atualiza o conteúdo final da proposta
    await prisma.finalContent.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content,
        version: 1
      },
      update: {
        content,
        version: { increment: 1 }
      }
    });

    // Salva ou sincroniza as classificações de ano/sub-categoria
    if (classifications && Array.isArray(classifications)) {
      await prisma.pedagogicalClassification.deleteMany({
        where: { sessionId }
      });

      if (classifications.length > 0) {
        await prisma.pedagogicalClassification.createMany({
          data: classifications.map((c: any) => ({
            sessionId,
            year: c.year,
            subcategory: c.subcategory
          }))
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      status: action === 'approve' ? 'AGUARDANDO_DIRETORIA' : 'GERADO' 
    });

  } catch (error: any) {
    console.error('Failed to save content:', error);
    return NextResponse.json({ error: error.message || 'Failed to save content' }, { status: 500 });
  }
}
