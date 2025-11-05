import { NextResponse } from 'next/server';
import { createCsrfToken } from '@/lib/auth/csrf';

export async function GET() {
  return NextResponse.json({ csrfToken: createCsrfToken() });
}
