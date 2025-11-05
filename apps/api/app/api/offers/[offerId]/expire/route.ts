import { NextResponse } from 'next/server';
import { marketplace } from '../../../../../lib/services.js';

export async function POST(_request: Request, { params }: { params: { offerId: string } }) {
  const offer = await marketplace.expireOffer(params.offerId);
  return NextResponse.json(offer);
}
