import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth-server';

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { nome, sobrenome, email, password } = await req.json().catch(() => ({}));

    if (!nome || !email) {
      return NextResponse.json({ error: 'Nome e E-mail são obrigatórios' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email is already taken by another user
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: user.id }
      }
    });

    if (emailTaken) {
      return NextResponse.json({ error: 'Este e-mail já está sendo utilizado por outro usuário' }, { status: 400 });
    }

    const updateData: any = {
      nome: nome.trim(),
      sobrenome: sobrenome ? sobrenome.trim() : null,
      email: cleanEmail,
    };

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'A senha deve conter no mínimo 6 caracteres' }, { status: 400 });
      }
      updateData.passwordHash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
