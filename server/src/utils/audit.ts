import { AuditType } from '@prisma/client';
import { prisma } from '../config/db';

export async function createAuditLog(
  type: AuditType,
  actor: string,
  entity: string,
  action: string,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  await prisma.auditLog.create({
    data: { type, actor, entity, action, metadata: (metadata as object) ?? undefined },
  });
}
