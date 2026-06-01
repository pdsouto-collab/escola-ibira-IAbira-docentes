import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const subcategory = searchParams.get('subcategory');

    const whereClause: any = {
      status: 'APROVADO',
    };

    // Filtra através das relações se houver filtro selecionado
    if ((year && year !== 'TODAS') || (subcategory && subcategory !== 'TODAS')) {
      whereClause.classifications = {
        some: {
          ...(year && year !== 'TODAS' ? { year } : {}),
          ...(subcategory && subcategory !== 'TODAS' ? { subcategory } : {})
        }
      };
    }

    const sessions = await prisma.pedagogicalSession.findMany({
      where: whereClause,
      include: {
        finalContent: true,
        classifications: true,
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
