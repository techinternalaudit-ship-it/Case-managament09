import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseVisibilityFilter } from "@/lib/rbac";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const att = await db.caseAttachment.findUnique({ where: { id }, include: { case: true } });
  if (!att) return new Response("Not found", { status: 404 });

  // Enforce RBAC: ensure user can see the parent case
  const where = caseVisibilityFilter(session.user);
  const allowed = await db.case.findFirst({ where: { AND: [{ id: att.caseId }, where] } });
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const full = path.resolve(process.env.STORAGE_DIR ?? "./uploads", att.storageKey);
  const buf = await readFile(full);
  return new Response(buf, {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(att.filename)}"`,
    },
  });
}
