import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [/^\/api\/auth\//, /^\/auth\//, /^\/$/];

const ROLE_RULES: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^\/api\/admin\//, roles: ['ADMIN'] },
  { pattern: /^\/api\/support\//, roles: ['ADMIN', 'SUPPORT'] },
  { pattern: /^\/api\/seller\//, roles: ['ADMIN', 'SELLER'] },
  { pattern: /^\/dashboard\/admin/, roles: ['ADMIN'] },
  { pattern: /^\/dashboard\/seller/, roles: ['ADMIN', 'SELLER'] }
];

const requiresAuth = (pathname: string) => {
  if (PUBLIC_PATHS.some((regex) => regex.test(pathname))) {
    return false;
  }

  return /^\/api\//.test(pathname) || /^\/dashboard\//.test(pathname);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL('/auth/login', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = typeof token.role === 'string' ? token.role : undefined;

  for (const rule of ROLE_RULES) {
    if (rule.pattern.test(pathname) && (!role || !rule.roles.includes(role))) {
      return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
};
