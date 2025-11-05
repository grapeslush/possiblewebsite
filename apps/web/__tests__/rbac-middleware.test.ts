import { NextRequest } from 'next/server';
import { middleware } from '../middleware';
import { getToken } from 'next-auth/jwt';

jest.mock('next-auth/jwt');

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret';
});

afterEach(() => {
  mockedGetToken.mockReset();
});

const createRequest = (path: string, cookie?: string) => {
  const headers = cookie ? { cookie } : undefined;
  return new NextRequest(`https://example.com${path}`, { headers });
};

describe('RBAC middleware', () => {
  it('redirects unauthenticated users to login', async () => {
    mockedGetToken.mockResolvedValueOnce(null as never);
    const request = createRequest('/dashboard/seller');
    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('blocks users without required role', async () => {
    mockedGetToken.mockResolvedValueOnce({ role: 'SELLER' } as never);
    const request = createRequest('/dashboard/admin');
    const response = await middleware(request);

    expect(response.headers.get('location')).toBe('https://example.com/auth/unauthorized');
  });

  it('honours bypass role cookie in non-production environments', async () => {
    mockedGetToken.mockResolvedValueOnce(null as never);
    const request = createRequest('/dashboard/admin', 'x-playwright-role=ADMIN');
    const response = await middleware(request);

    expect(response.headers.get('location')).toBeNull();
  });
});
