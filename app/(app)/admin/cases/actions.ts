"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can, type SessionUser } from "@/lib/rbac";

async function requireAdmin(): Promise<SessionUser> {
  const s = await auth();
  if (!s?.user) throw new Error("UNAUTHENTICATED");
  if (!can(s.user, "case:edit-any")) throw new Error("FORBIDDEN");
  return s.user;
}

export async function listAllCases() {
  await requireAdmin();
  return db.case.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true } },
      category: { select: { name: true } },
      subCategory: { select: { name: true } },
    },
  });
}
