import { NextResponse } from 'next/server';
import { prisma, AuthService } from '@possiblewebsite/db';

const authService = new AuthService(prisma);

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({ token: null }));

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const userId = await authService.verifyEmailToken(token);

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
