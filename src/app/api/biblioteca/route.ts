import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const faixaEtaria = searchParams.get('faixaEtaria');

    const whereClause: any = {
      status: 'APROVADO',
    };

    if (faixaEtaria && faixaEtaria !== 'TODAS') {
      whereClause.faixaEtaria = faixaEtaria;
    }

    const sessions = await prisma.pedagogicalSession.findMany({
      where: whereClause,
      include: {
        finalContent: true,
        educador: {
          select: { nome: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Fetch biblioteca error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
