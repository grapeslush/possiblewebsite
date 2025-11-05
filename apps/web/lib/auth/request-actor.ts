import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ForbiddenError } from './rbac';

const isNonProduction = process.env.NODE_ENV !== 'production';

export interface RequestActor {
  id: string;
  role: string;
  bypass: boolean;
}

export const resolveRequestActor = async (
  request: NextRequest,
  roles: string[],
): Promise<RequestActor> => {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (token?.role && typeof token.role === 'string' && roles.includes(token.role)) {
    return {
      id: typeof token.sub === 'string' ? token.sub : 'unknown-user',
      role: token.role,
      bypass: false,
    };
  }

  if (isNonProduction) {
    const bypassRole =
      request.cookies.get('x-playwright-role')?.value ??
      request.headers.get('x-playwright-role') ??
      undefined;

    if (bypassRole && roles.includes(bypassRole)) {
      const actorId =
        request.cookies.get('x-playwright-user')?.value ??
        request.headers.get('x-playwright-user') ??
        `test-${bypassRole.toLowerCase()}`;

      return {
        id: actorId,
        role: bypassRole,
        bypass: true,
      };
    }
  }

  throw new ForbiddenError();
};
