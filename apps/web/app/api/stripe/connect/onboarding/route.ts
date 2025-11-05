import { NextResponse } from 'next/server';
import { prisma } from '@possiblewebsite/db';
import { getServerAuthSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { verifyCsrfToken, getCsrfHeaderName } from '@/lib/auth/csrf';

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const session = await getServerAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfToken = request.headers.get(getCsrfHeaderName());
  if (!verifyCsrfToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let connectAccountId = user.stripeConnectId;

  if (!connectAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email
    });

    connectAccountId = account.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectId: connectAccountId }
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const link = await stripe.accountLinks.create({
    account: connectAccountId,
    refresh_url: `${appUrl}/dashboard/billing`,
    return_url: `${appUrl}/dashboard/billing/completed`,
    type: 'account_onboarding'
  });

  return NextResponse.json({ url: link.url });
}
