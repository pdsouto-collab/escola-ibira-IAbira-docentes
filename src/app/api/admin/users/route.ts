import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth-server';

async function checkAdminOrForbidden() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'Não autenticado', status: 401 };
  }
  if (currentUser.role !== 'ADMIN') {
    return { error: 'Acesso negado. Apenas administradores.', status: 403 };
  }
  return { currentUser };
}

export async function GET() {
  try {
    const authCheck = await checkAdminOrForbidden();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { nome: 'asc' }
      ]
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Failed to list users:', error);
    return NextResponse.json({ error: error.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authCheck = await checkAdminOrForbidden();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json().catch(() => ({}));
    const { nome, sobrenome, email, password, role } = body;

    if (!nome || !email || !password || !role) {
      return NextResponse.json({ error: 'Nome, E-mail, Senha e Perfil são obrigatórios' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      return NextResponse.json({ error: 'Usuário já cadastrado com este e-mail' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve conter pelo menos 6 caracteres' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        nome: nome.trim(),
        sobrenome: sobrenome ? sobrenome.trim() : null,
        email: cleanEmail,
        passwordHash: hashPassword(password),
        role: role
      },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authCheck = await checkAdminOrForbidden();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json().catch(() => ({}));
    const { id, nome, sobrenome, email, password, role } = body;

    if (!id || !nome || !email || !role) {
      return NextResponse.json({ error: 'ID, Nome, E-mail e Perfil são obrigatórios' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Check email uniqueness
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: id }
      }
    });

    if (emailTaken) {
      return NextResponse.json({ error: 'Este e-mail já está sendo utilizado por outro usuário' }, { status: 400 });
    }

    const updateData: any = {
      nome: nome.trim(),
      sobrenome: sobrenome ? sobrenome.trim() : null,
      email: cleanEmail,
      role: role
    };

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'A senha deve conter pelo menos 6 caracteres' }, { status: 400 });
      }
      updateData.passwordHash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
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
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authCheck = await checkAdminOrForbidden();
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Prevent deleting self
    if (id === authCheck.currentUser?.id) {
      return NextResponse.json({ error: 'Não é possível excluir a sua própria conta' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
