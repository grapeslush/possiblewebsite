import { NextResponse } from 'next/server';
import { reviews } from '../../../../lib/services';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pending = await reviews.listPendingForReview();
  return NextResponse.json(pending);
}
