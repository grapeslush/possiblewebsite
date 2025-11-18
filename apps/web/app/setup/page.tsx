import { redirect } from 'next/navigation';

import SetupClient from './setup-client';

export const dynamic = 'force-dynamic';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function fetchStatus() {
  try {
    const response = await fetch(`${apiBase}/api/setup/status`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('failed to fetch setup status', error);
    return null;
  }
}

export default async function SetupPage() {
  const status = await fetchStatus();

  if (status?.ready) {
    redirect('/');
  }

  return <SetupClient apiBase={apiBase} initialStatus={status ?? undefined} />;
}
