import { NextResponse } from 'next/server';
import { prisma, AuthService } from '@possiblewebsite/db';
import { hash } from 'bcryptjs';
import { getRequiredPolicies } from '@/lib/auth/policies';
import { sendVerificationEmail } from '@/lib/email';
import { createCsrfToken, getCsrfHeaderName, verifyCsrfToken } from '@/lib/auth/csrf';
import { stripe } from '@/lib/stripe';

const authService = new AuthService(prisma);

const formatPolicyTitle = (slug: string) =>
  slug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const validateBody = (body: any) => {
  if (!body) return { error: 'Missing body' };
  const { email, password, displayName, dateOfBirth, marketingOptIn = false, acceptPolicies } = body;

  if (typeof email !== 'string' || !email.includes('@')) {
    return { error: 'Invalid email' };
  }

  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  if (typeof displayName !== 'string' || displayName.length < 2) {
    return { error: 'Display name is required' };
  }

  const parsedDate = dateOfBirth ? new Date(dateOfBirth) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return { error: 'Date of birth is required' };
  }

  if (!AuthService.isAdult(parsedDate)) {
    return { error: 'You must be at least 18 years old to register' };
  }

  if (!Array.isArray(acceptPolicies) || acceptPolicies.length === 0) {
    return { error: 'Policy acceptance is required' };
  }

  return {
    email: email.toLowerCase(),
    password,
    displayName,
    dateOfBirth: parsedDate,
    marketingOptIn: Boolean(marketingOptIn),
    acceptPolicies: acceptPolicies as { policy: string; version: string }[]
  };
};

export async function GET() {
  return NextResponse.json({ csrfToken: createCsrfToken(), policies: getRequiredPolicies() });
}

export async function POST(request: Request) {
  const csrfToken = request.headers.get(getCsrfHeaderName());
  if (!verifyCsrfToken(csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = validateBody(body);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const requiredPolicies = getRequiredPolicies();
  const missingPolicy = requiredPolicies.find((policy) =>
    !result.acceptPolicies.some((accepted) => accepted.policy === policy.policy && accepted.version === policy.version)
  );

  if (missingPolicy) {
    return NextResponse.json(
      { error: `Missing acceptance for ${formatPolicyTitle(missingPolicy.policy)}` },
      { status: 400 }
    );
  }

  const passwordHash = await hash(result.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: result.email,
        passwordHash,
        displayName: result.displayName,
        dateOfBirth: result.dateOfBirth,
        ageVerifiedAt: new Date(),
        marketingOptIn: result.marketingOptIn
      }
    });

    await Promise.all(
      requiredPolicies.map(async (policy) => {
        const title = formatPolicyTitle(policy.policy);
        const record = await prisma.policy.upsert({
          where: { slug: policy.policy },
          update: {
            title,
            version: policy.version,
            isActive: true,
            publishedAt: new Date()
          },
          create: {
            id: policy.policy,
            slug: policy.policy,
            title,
            summary: `${title} for the Bassline Tackle Exchange community.`,
            body: `Review and accept the ${title} to trade bass fishing tackle responsibly on Bassline Tackle Exchange.`,
            category: 'marketplace',
            version: policy.version,
            audience: 'all-users',
            isRequiredForBuyers: true,
            isRequiredForSellers: true,
            isActive: true,
            publishedAt: new Date()
          }
        });

        await authService.recordPolicyAcceptance(user.id, record.id, record.version, null);
      })
    );

    if (stripe) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    const { token } = await authService.createEmailVerificationToken(user);
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    await sendVerificationEmail({ email: user.email, token, verificationUrl });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Unable to register' }, { status: 500 });
  }
}
