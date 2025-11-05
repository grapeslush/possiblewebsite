import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAuditLog } from '@/lib/audit';
import { resolveRequestActor } from '@/lib/auth/request-actor';

const schema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request, ['ADMIN']);
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    await recordAuditLog({
      actorId: actor.id,
      entity: 'financial_report',
      entityId: parsed.data.format,
      action: 'FINANCIAL_REPORT_EXPORT_REQUESTED',
      metadata: { format: parsed.data.format, bypass: actor.bypass },
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
