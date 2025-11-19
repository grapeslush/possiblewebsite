import { NextResponse } from 'next/server';
import { prisma, AuthService } from '@possiblewebsite/db';
import { getServerAuthSession } from '@/lib/auth';
import { verifyCsrfToken } from '@/lib/auth/csrf.server';
import { getCsrfHeaderName } from '@/lib/auth/csrf';

const authService = new AuthService(prisma);

const formatPolicyTitle = (slug: string) =>
  slug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

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

  const title = formatPolicyTitle(policy);
  const policyRecord = await prisma.policy.upsert({
    where: { slug: policy },
    update: {
      title,
      version,
      isActive: true,
      publishedAt: new Date(),
    },
    create: {
      id: policy,
      slug: policy,
      title,
      summary: `${title} for the Bassline Tackle Exchange community.`,
      body: `Review and accept the ${title} to stay compliant on Bassline Tackle Exchange.`,
      category: 'marketplace',
      version,
      audience: 'all-users',
      isRequiredForBuyers: true,
      isRequiredForSellers: true,
      isActive: true,
      publishedAt: new Date(),
    },
  });

  await authService.recordPolicyAcceptance(
    session.user.id,
    policyRecord.id,
    policyRecord.version,
    null,
  );

  return NextResponse.json({ success: true });
}
