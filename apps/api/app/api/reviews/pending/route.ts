import { NextResponse } from 'next/server';
import { reviews } from '../../../../lib/services.js';

export async function GET() {
  const pending = await reviews.listPendingForReview();
  return NextResponse.json(pending);
}
