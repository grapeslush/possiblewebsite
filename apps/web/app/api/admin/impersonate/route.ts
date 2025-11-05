import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAuditLog } from '@/lib/audit';
import { resolveRequestActor } from '@/lib/auth/request-actor';

const schema = z.object({
  targetUserId: z.string(),
  reason: z.string().min(10),
  targetRole: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request, ['ADMIN']);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    if (parsed.data.targetRole === 'ADMIN') {
      return NextResponse.json(
        { error: 'Peer-admin impersonation requires security approval.' },
        { status: 403 },
      );
    }

    await recordAuditLog({
      actorId: actor.id,
      entity: 'user',
      entityId: parsed.data.targetUserId,
      action: 'ADMIN_IMPERSONATION_INITIATED',
      metadata: { reason: parsed.data.reason, bypass: actor.bypass },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
