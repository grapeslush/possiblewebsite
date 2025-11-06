import { NextRequest, NextResponse } from 'next/server';

import { applyTrackingUpdate } from '../../../../lib/shipping/service';
import { getShippingProvider } from '../../../../lib/shipping/index';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-pirateship-signature');
  const timestamp = request.headers.get('x-pirateship-timestamp');

  const arrayBuffer = await request.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);

  const provider = getShippingProvider();
  const verified = await provider.verifyWebhookSignature(bodyBuffer, signature, timestamp);

  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(bodyBuffer.toString('utf8'));
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const event = await provider.parseWebhookEvent(payload);

  if (event.type === 'tracking.updated' && event.trackingNumber && event.status) {
    await applyTrackingUpdate(
      event.trackingNumber,
      {
        status: event.status,
        detail: event.detail,
        occurredAt: event.occurredAt ?? new Date(),
        trackingUrl: event.trackingUrl,
        carrier: event.carrier,
      },
      'webhook',
    );
  }

  return NextResponse.json({ received: true });
}
