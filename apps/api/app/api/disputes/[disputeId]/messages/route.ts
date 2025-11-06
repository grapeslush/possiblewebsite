import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectProfanity } from '../../../../../lib/profanity';
import { verifyCaptcha } from '../../../../../lib/hcaptcha';
import { rateLimiter } from '../../../../../lib/rate-limit';
import { notifyDisputeMessage } from '../../../../../lib/communication';
import { disputes, prisma } from '../../../../../lib/services';

const messageSchema = z.object({
  authorId: z.string(),
  body: z.string().min(1).max(2000),
  captchaToken: z.string().optional(),
  internal: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { disputeId: string } }) {
  const messages = await disputes.listMessages(params.disputeId);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest, { params }: { params: { disputeId: string } }) {
  const payload = await request.json();
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const captchaPassed = await verifyCaptcha(parsed.data.captchaToken ?? null);

  if (!captchaPassed) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403 });
  }

  const allowed = await rateLimiter.consume(`dispute-message:${parsed.data.authorId}`, {
    max: 5,
    windowMs: 60_000,
  });

  if (!allowed) {
    return NextResponse.json({ error: 'Message rate limit exceeded' }, { status: 429 });
  }

  const profanity = detectProfanity(parsed.data.body);

  if (profanity.blocked) {
    await prisma.moderationEvent.create({
      data: {
        type: 'MESSAGE',
        entityId: params.disputeId,
        actorId: parsed.data.authorId,
        action: 'blocked',
        metadata: { matches: profanity.matches },
      },
    });

    return NextResponse.json(
      {
        error: 'Message blocked by moderation policy',
        matches: profanity.matches,
      },
      { status: 422 },
    );
  }

  const dispute = await disputes.getDisputeWithParticipants(params.disputeId);

  if (!dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  }

  const message = await disputes.addMessage(
    params.disputeId,
    parsed.data.authorId,
    parsed.data.body,
    parsed.data.internal ?? false,
  );

  if (!parsed.data.internal) {
    const participants = [dispute.raisedBy, dispute.assignedTo].filter(
      (participant): participant is NonNullable<typeof participant> =>
        !!participant && participant.id !== parsed.data.authorId,
    );

    const authorDisplayName =
      dispute.raisedBy?.id === parsed.data.authorId
        ? dispute.raisedBy.displayName
        : dispute.assignedTo?.id === parsed.data.authorId
          ? dispute.assignedTo.displayName
          : undefined;

    await notifyDisputeMessage({
      disputeId: dispute.id,
      orderId: dispute.orderId,
      author: {
        id: parsed.data.authorId,
        displayName: authorDisplayName,
      },
      recipients: participants.map((participant) => ({
        id: participant.id,
        email: participant.email,
        displayName: participant.displayName,
      })),
      message: parsed.data.body,
    });
  }

  await prisma.moderationEvent.create({
    data: {
      type: 'MESSAGE',
      entityId: params.disputeId,
      actorId: parsed.data.authorId,
      action: 'allowed',
    },
  });

  return NextResponse.json(message, { status: 201 });
}
