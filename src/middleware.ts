import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'iabira-secret-key-12345-nature-education-docentes'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and public resources pass through
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.userId) {
      throw new Error('Invalid session payload');
    }

    const userRole = payload.role as string;

    // RBAC Permissions
    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/diretoria') && userRole !== 'DIRETOR' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware session verification failed:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/',
    '/biblioteca/:path*',
    '/diretoria/:path*',
    '/admin/:path*',
    '/api/agent/:path*',
    '/api/biblioteca/:path*',
    '/api/diretoria/:path*',
    '/api/knowledge-base/:path*',
    '/api/subcategories/:path*',
    '/api/admin/:path*',
    '/api/chat/:path*',
    '/api/auth/me',
    '/api/auth/profile'
  ],
};
