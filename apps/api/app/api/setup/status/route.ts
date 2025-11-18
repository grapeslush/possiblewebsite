import { NextResponse } from 'next/server';

import { instrumentRoute } from '../../../../lib/observability';
import { getSetupStatus } from '../../../../lib/setup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler() {
  const status = await getSetupStatus();
  return NextResponse.json(status, { status: status.ready ? 200 : 503 });
}

export const GET = instrumentRoute('setup.status', handler);
