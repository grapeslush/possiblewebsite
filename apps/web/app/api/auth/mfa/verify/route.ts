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

  const { deviceId, token } = await request.json().catch(() => ({ deviceId: null, token: null }));

  if (!deviceId || typeof deviceId !== 'string' || !token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const device = await prisma.totpDevice.findFirst({
    where: { id: deviceId, userId: session.user.id },
  });

  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  const success = await authService.verifyTotpCode(device, token);

  if (!success) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
