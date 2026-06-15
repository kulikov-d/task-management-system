import { AsyncLocalStorage } from "async_hooks";
import { prisma } from "../../config/database";

export const userContext = new AsyncLocalStorage<{ userId: string }>();

export async function auditLog(
  action: string,
  entity: string,
  entityId: string,
  diff?: Record<string, unknown> | null
): Promise<void> {
  const store = userContext.getStore();
  const userId = store?.userId;
  if (!userId) return;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        diff: diff ? (diff as any) : undefined,
        userId,
      },
    });
  } catch {
    // Silent fail — audit should never break main operation
  }
}
