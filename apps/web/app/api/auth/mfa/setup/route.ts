import { NextResponse } from 'next/server';
import { prisma, AuthService } from '@possiblewebsite/db';
import { getServerAuthSession } from '@/lib/auth';
import { getCsrfHeaderName } from '@/lib/auth/csrf';
import { verifyCsrfToken } from '@/lib/auth/csrf.server';

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

  const { secret, otpauthUrl } = authService.generateTotpSecret(
    session.user.email ?? session.user.id,
    'TackleExchange',
  );

  const device = await authService.createTotpDevice(session.user.id, secret, 'Authenticator App');

  return NextResponse.json({ deviceId: device.id, otpauthUrl });
}
