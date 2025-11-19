import 'server-only';

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

import { getCsrfHeaderName } from './csrf';

const CSRF_COOKIE_NAME = '__Host-csrf-token';

const getSecret = () => {
  const cookieStore = cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existing) {
    return existing;
  }

  const secret = randomBytes(32).toString('hex');
  cookieStore.set(CSRF_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return secret;
};

const deriveToken = (secret: string) => {
  const hash = createHash('sha256');
  hash.update(secret);
  hash.update(process.env.NEXTAUTH_SECRET ?? 'change-me');
  return hash.digest('hex');
};

export const createCsrfToken = () => deriveToken(getSecret());

export const verifyCsrfToken = (token: string | null | undefined) => {
  if (!token) return false;
  const cookieStore = cookies();
  const secret = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (!secret) return false;

  const expected = deriveToken(secret);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch (error) {
    return false;
  }
};

export const getCsrfCookieName = () => CSRF_COOKIE_NAME;
export const getCsrfHeaderNameServer = () => getCsrfHeaderName();
