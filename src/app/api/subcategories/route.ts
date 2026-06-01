import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_YEARS = ["Infantil", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
const DEFAULT_CATEGORIES = ["Artes", "Ciências", "Educação Física", "Geografia", "História", "Língua Portuguesa", "Matemática", "Música"];

async function seedSubcategoriesIfEmpty() {
  const count = await prisma.subcategory.count();
  if (count === 0) {
    console.log("Subcategory table is empty. Seeding defaults...");
    const dataToInsert = [];
    for (const year of DEFAULT_YEARS) {
      for (const cat of DEFAULT_CATEGORIES) {
        dataToInsert.push({
          name: cat,
          year: year,
        });
      }
    }
    await prisma.subcategory.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    await seedSubcategoriesIfEmpty();

    const whereClause: any = {};
    if (year) {
      whereClause.year = year;
    }

    const subcategories = await prisma.subcategory.findMany({
      where: whereClause,
      orderBy: [
        { year: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ subcategories });
  } catch (error: any) {
    console.error('Failed to fetch subcategories:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, year } = body;

    if (!name || !year) {
      return NextResponse.json({ error: 'Name and Year are required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Check if it already exists
    const existing = await prisma.subcategory.findUnique({
      where: {
        name_year: {
          name: trimmedName,
          year: year,
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Sub-categoria já cadastrada para este ano' }, { status: 400 });
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name: trimmedName,
        year: year,
      }
    });

    return NextResponse.json({ subcategory });
  } catch (error: any) {
    console.error('Failed to create subcategory:', error);
    return NextResponse.json({ error: error.message || 'Failed to create subcategory' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Get subcategory to check year
    const sub = await prisma.subcategory.findUnique({
      where: { id }
    });

    if (!sub) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // Check if another subcategory with the same name exists for this year
    const existing = await prisma.subcategory.findFirst({
      where: {
        name: trimmedName,
        year: sub.year,
        id: { not: id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Já existe outra sub-categoria com este nome para este ano' }, { status: 400 });
    }

    const updated = await prisma.subcategory.update({
      where: { id },
      data: {
        name: trimmedName,
      }
    });

    return NextResponse.json({ subcategory: updated });
  } catch (error: any) {
    console.error('Failed to update subcategory:', error);
    return NextResponse.json({ error: error.message || 'Failed to update subcategory' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    const sub = await prisma.subcategory.findUnique({
      where: { id }
    });

    if (!sub) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    await prisma.subcategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete subcategory:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete subcategory' }, { status: 500 });
  }
}
