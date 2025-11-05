import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { JWT } from 'next-auth/jwt';
import { prisma, AuthService } from '@possiblewebsite/db';
import type { PolicyAcceptance, TotpDevice } from '@prisma/client';
import { hasAcceptedAllPolicies, missingPolicies } from './policies';

const authService = new AuthService(prisma);

const rotationInterval = 60 * 60; // 1 hour

const withSessionRotation = async (token: JWT) => {
  const now = Math.floor(Date.now() / 1000);
  const lastRotated = typeof token.lastRotated === 'number' ? token.lastRotated : 0;

  if (!token.sessionNonce || now - lastRotated > rotationInterval) {
    token.sessionNonce = randomUUID();
    token.lastRotated = now;
  }

  return token;
};

const sanitizeUser = (user: User & { policyAcceptances?: PolicyAcceptance[]; totpDevices?: TotpDevice[] }) => {
  const { policyAcceptances = [], totpDevices = [], ...rest } = user;
  return { ...rest, policyAcceptances, totpDevices };
};

const providers = [
  CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: 'Authentication Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('INVALID_CREDENTIALS');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { policyAcceptances: true, totpDevices: { where: { verifiedAt: { not: null } }, take: 1 } }
        });

        if (!user) {
          throw new Error('INVALID_CREDENTIALS');
        }

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('INVALID_CREDENTIALS');
        }

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        if (!user.ageVerifiedAt || (user.dateOfBirth && !AuthService.isAdult(user.dateOfBirth))) {
          throw new Error('AGE_VERIFICATION_REQUIRED');
        }

        if (!hasAcceptedAllPolicies(user.policyAcceptances)) {
          throw new Error('POLICY_ACCEPTANCE_REQUIRED');
        }

        if (user.twoFactorEnabled) {
          const [device] = user.totpDevices;
          if (!credentials.totp) {
            throw new Error('MFA_REQUIRED');
          }

          if (!device) {
            throw new Error('MFA_NOT_CONFIGURED');
          }

          const isValidTotp = await authService.verifyTotpCode(device, credentials.totp);
          if (!isValidTotp) {
            throw new Error('MFA_INVALID');
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return sanitizeUser(user);
      }
    })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7
  },
  cookies: {
    sessionToken: {
      name: '__Secure-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  },
  pages: {
    signIn: '/auth/login',
    verifyRequest: '/auth/verify-email'
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!user) return false;

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { policyAcceptances: true }
      });

      if (!dbUser) return false;

      if (account?.provider !== 'credentials') {
        if (!dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { emailVerified: new Date() }
          });
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // @ts-expect-error custom property
        token.role = user.role;
      }

      token = await withSessionRotation(token);

      return token;
    },
    async session({ session, token }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub ?? '' },
        include: { policyAcceptances: true }
      });

      if (dbUser) {
        (session.user as Session['user'] & { role?: string }) = {
          ...session.user,
          id: dbUser.id,
          role: dbUser.role,
          emailVerified: dbUser.emailVerified,
          requiresPolicyAcceptance: missingPolicies(dbUser.policyAcceptances)
        } as Session['user'];
      }

      // @ts-expect-error include nonce for clients to detect rotation
      session.sessionNonce = token.sessionNonce;

      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      }
    }
  }
};

export default authOptions;
