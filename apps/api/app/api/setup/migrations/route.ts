import { NextResponse } from 'next/server';

import { instrumentRoute } from '../../../../lib/observability';
import { runMigrations } from '../../../../lib/setup';

export const runtime = 'nodejs';

async function handler() {
  const result = await runMigrations();

  if (!result.ok) {
    return NextResponse.json({ error: result.error, ranAt: result.ranAt }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Migrations applied',
    ranAt: result.ranAt,
    output: result.output,
  });
}

export const POST = instrumentRoute('setup.migrations', handler);
