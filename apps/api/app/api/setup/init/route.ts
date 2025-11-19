import { NextResponse } from 'next/server';

import { instrumentRoute } from '../../../../lib/observability';
import { initializePlatform } from '../../../../lib/setup';

export const runtime = 'nodejs';

async function handler() {
  const result = await initializePlatform();

  if (!result.ok) {
    return NextResponse.json({ error: result.error, ranAt: result.ranAt }, { status: 500 });
  }

  return NextResponse.json({
    message: result.alreadyCompleted ? 'Setup already completed' : 'Setup finished',
    completedAt: result.completedAt,
    migrationsRanAt: result.migrationsRanAt,
    seedRanAt: result.seedRanAt,
  });
}

export const POST = instrumentRoute('setup.init', handler);
