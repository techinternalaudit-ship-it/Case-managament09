import { db } from "./db";

type Diff = Record<string, { before: unknown; after: unknown }>;

export function buildDiff<T extends Record<string, unknown>>(before: T | null, after: T): Diff {
  const diff: Diff = {};
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after),
  ]);
  for (const key of keys) {
    const a = before?.[key];
    const b = (after as Record<string, unknown>)[key];
    const aStr = a instanceof Date ? a.toISOString() : a;
    const bStr = b instanceof Date ? b.toISOString() : b;
    if (JSON.stringify(aStr) !== JSON.stringify(bStr)) {
      diff[key] = { before: aStr ?? null, after: bStr ?? null };
    }
  }
  return diff;
}

export async function recordAudit(args: {
  entity: string;
  entityId: string;
  caseId?: string | null;
  action: string;
  diff: Diff | Record<string, unknown>;
  userId: string;
}) {
  await db.auditLog.create({
    data: {
      entity: args.entity,
      entityId: args.entityId,
      caseId: args.caseId ?? null,
      action: args.action,
      diff: JSON.stringify(args.diff),
      userId: args.userId,
    },
  });
}
