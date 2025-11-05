import { AuditRepository, prisma } from '@possiblewebsite/db';

const repository = new AuditRepository(prisma);

export const recordAuditLog = async (input: {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await repository.createLog(input);
  } catch (error) {
    console.error('Failed to record audit log', error);
  }
};
