import { NextResponse } from 'next/server';
import { prisma, AuthService } from '@possiblewebsite/db';
import { getServerAuthSession } from '@/lib/auth';
import { verifyCsrfToken, getCsrfHeaderName } from '@/lib/auth/csrf';

const authService = new AuthService(prisma);

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get(getCsrfHeaderName());
  if (!verifyCsrfToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const { policy, version } = await request.json().catch(() => ({ policy: null, version: null }));

  if (!policy || !version) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await authService.recordPolicyAcceptance(session.user.id, policy, version, null);

  return NextResponse.json({ success: true });
}
