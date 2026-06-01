import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, hashPassword, signJWT } from '@/lib/auth-server';

async function seedUsersIfEmpty() {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log("No users found in database. Seeding default accounts...");
    
    const admin = await prisma.user.create({
      data: {
        nome: 'Admin',
        sobrenome: 'Ibirá',
        email: 'admin@ibira.com',
        passwordHash: hashPassword('admin123'),
        role: 'ADMIN'
      }
    });

    const director = await prisma.user.create({
      data: {
        nome: 'Diretora',
        sobrenome: 'Pedagógica',
        email: 'diretora@ibira.com',
        passwordHash: hashPassword('diretora123'),
        role: 'DIRETOR'
      }
    });

    const teacher = await prisma.user.create({
      data: {
        nome: 'Professora',
        sobrenome: 'Ibirá',
        email: 'professora@ibira.com',
        passwordHash: hashPassword('professora123'),
        role: 'EDUCADOR'
      }
    });

    console.log("Users seeded successfully.");
  }
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Seed default users if the table is empty
    await seedUsersIfEmpty();

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const passwordMatch = comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        role: user.role
      }
    });

    // Set HTTP-Only Session Cookie
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar login' }, { status: 500 });
  }
}
