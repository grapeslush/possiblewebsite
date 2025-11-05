import { cookies, headers } from 'next/headers';
import { requireRole } from './rbac';

interface PageRoleContext {
  role: string;
  userId: string;
  bypass: boolean;
}

const isNonProduction = process.env.NODE_ENV !== 'production';

export const ensurePageRole = async (roles: string[]): Promise<PageRoleContext> => {
  if (isNonProduction) {
    const testRole =
      cookies().get('x-playwright-role')?.value ?? headers().get('x-playwright-role') ?? undefined;
    if (testRole && roles.includes(testRole)) {
      const userId =
        cookies().get('x-playwright-user')?.value ??
        headers().get('x-playwright-user') ??
        `test-${testRole.toLowerCase()}`;
      return { role: testRole, userId, bypass: true };
    }
  }

  const session = await requireRole(roles);
  return { role: session.user.role, userId: session.user.id, bypass: false };
};
