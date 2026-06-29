import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string;
  compoundId?: string;
  entityName: string;
  entityId: string;
  action: AuditAction;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      compoundId: input.compoundId,
      entityName: input.entityName,
      entityId: input.entityId,
      action: input.action,
      before: input.before,
      after: input.after,
      metadata: input.metadata
    }
  });
}
