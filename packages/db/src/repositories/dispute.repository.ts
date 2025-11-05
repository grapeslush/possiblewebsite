import {
  DisputeStatus,
  NotificationType,
  PrismaClient
} from '@prisma/client';

export interface OpenDisputeInput {
  orderId: string;
  raisedById: string;
  assignedToId?: string | null;
  reason: string;
  initialMessage: string;
}

export class DisputeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  openDispute(input: OpenDisputeInput) {
    return this.prisma.dispute.create({
      data: {
        orderId: input.orderId,
        raisedById: input.raisedById,
        assignedToId: input.assignedToId ?? undefined,
        reason: input.reason,
        status: DisputeStatus.OPEN,
        messages: {
          create: {
            authorId: input.raisedById,
            body: input.initialMessage
          }
        }
      },
      include: {
        messages: true
      }
    });
  }

  assignAgent(disputeId: string, agentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          assignedToId: agentId,
          status: DisputeStatus.UNDER_REVIEW
        }
      });

      await tx.notification.create({
        data: {
          userId: agentId,
          type: NotificationType.DISPUTE_UPDATED,
          payload: {
            disputeId,
            message: 'You have been assigned to a dispute.'
          }
        }
      });

      return dispute;
    });
  }

  addMessage(disputeId: string, authorId: string, body: string, isInternal = false) {
    return this.prisma.disputeMessage.create({
      data: {
        disputeId,
        authorId,
        body,
        isInternal
      }
    });
  }

  resolveDispute(disputeId: string, resolution: string) {
    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution,
        resolvedAt: new Date()
      }
    });
  }

  getOpenDisputes() {
    return this.prisma.dispute.findMany({
      where: {
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.ESCALATED]
        }
      },
      include: {
        order: {
          select: {
            id: true,
            buyer: { select: { id: true, displayName: true } },
            seller: { select: { id: true, displayName: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
