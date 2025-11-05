import type { PolicyAcceptance } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      emailVerified: Date | null;
      requiresPolicyAcceptance: { policy: string; version: string }[];
    };
    sessionNonce?: string;
  }

  interface User {
    id: string;
    role: string;
    emailVerified: Date | null;
    policyAcceptances?: PolicyAcceptance[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    sessionNonce?: string;
    lastRotated?: number;
  }
}
