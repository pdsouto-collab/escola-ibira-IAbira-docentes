import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// 1. GET: Retorna as preferências atuais do usuário logado
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const userPref = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });

    return NextResponse.json({ preferences: userPref?.preferences || '' });
  } catch (error: any) {
    console.error('Erro ao buscar preferências:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// 2. POST: Permite edição manual das preferências pelo educador
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { preferences } = await req.json().catch(() => ({}));

    if (preferences === undefined) {
      return NextResponse.json({ error: 'Preferences field is required' }, { status: 400 });
    }

    const updated = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        preferences: preferences.trim(),
      },
      update: {
        preferences: preferences.trim(),
      }
    });

    return NextResponse.json({ success: true, preferences: updated.preferences });
  } catch (error: any) {
    console.error('Erro ao salvar preferências:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// 3. DELETE: Limpa a memória das preferências (Reset)
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    await prisma.userPreference.delete({
      where: { userId: user.id }
    }).catch(() => {
      // Ignora erro caso não existisse registro de preferência
    });

    return NextResponse.json({ success: true, preferences: '' });
  } catch (error: any) {
    console.error('Erro ao resetar preferências:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
