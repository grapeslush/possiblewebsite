import { getServerAuthSession } from './index';

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export const requireRole = async (roles: string[]) => {
  const session = await getServerAuthSession();

  if (!session?.user || !roles.includes(session.user.role)) {
    throw new ForbiddenError();
  }

  return session;
};
