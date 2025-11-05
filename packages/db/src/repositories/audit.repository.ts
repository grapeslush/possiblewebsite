import { PrismaClient } from '@prisma/client';

export interface CreateAuditLogInput {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export class AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createLog(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata ?? undefined,
      },
    });
  }
}
