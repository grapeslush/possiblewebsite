import { NextResponse } from 'next/server';

import { createCsrfToken } from '@/lib/auth/csrf.server';

export async function GET() {
  return NextResponse.json({ csrfToken: createCsrfToken() });
}
