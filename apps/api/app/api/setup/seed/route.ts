import { NextResponse } from 'next/server';

import { instrumentRoute } from '../../../../lib/observability';
import { runSeed } from '../../../../lib/setup';

export const runtime = 'nodejs';

async function handler() {
  const result = await runSeed();

  if (!result.ok) {
    return NextResponse.json({ error: result.error, ranAt: result.ranAt }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Seed data loaded',
    ranAt: result.ranAt,
    output: result.output,
  });
}

export const POST = instrumentRoute('setup.seed', handler);
