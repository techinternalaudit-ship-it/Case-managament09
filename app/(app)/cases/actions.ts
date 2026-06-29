"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can, caseVisibilityFilter, type SessionUser } from "@/lib/rbac";
import { computeTAT } from "@/lib/tat";
import { buildDiff, recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function user(): Promise<SessionUser> {
  const s = await auth();
  if (!s?.user) throw new Error("UNAUTHENTICATED");
  return s.user;
}

const intakeSchema = z.object({
  caseNo: z.coerce.number().int().positive(),
  escalationChannel: z.string().min(1),
  complaintDate: z.string().min(1),
  escalationDate: z.string().optional().nullable(),
  assignDate: z.string().optional().nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assigneeId: z.string().optional().nullable(),
  subjectLine: z.string().min(1),
  complainantType: z.string().optional().nullable(),
  complainantName: z.string().optional().nullable(),
  complainantECode: z.string().optional().nullable(),
  complainantEntity: z.string().optional().nullable(),
  complainantGrade: z.string().optional().nullable(),
  respondentName: z.string().min(1),
  respondentECode: z.string().optional().nullable(),
  respondentEntity: z.string().min(1),
  respondentGrade: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  hrbpSpoc: z.string().optional().nullable(),
  hodName: z.string().optional().nullable(),
  hodEntity: z.string().optional().nullable(),
  respondentDept: z.string().optional().nullable(),
  saleNonSale: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  subCategoryId: z.string().min(1),
});

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "long" });
}

export async function createCase(formData: FormData) {
  const u = await user();
  if (!can(u, "case:create")) throw new Error("FORBIDDEN");

  const parsed = intakeSchema.parse(Object.fromEntries(formData));
  const complaint = toDate(parsed.complaintDate);
  if (!complaint) throw new Error("Invalid complaint date");
  const tat = computeTAT({ complaintDate: complaint, severity: parsed.severity });

  const created = await db.case.create({
    data: {
      caseNo: parsed.caseNo,
      escalationChannel: parsed.escalationChannel,
      complaintDate: complaint,
      escalationDate: toDate(parsed.escalationDate),
      assignDate: toDate(parsed.assignDate),
      month: monthLabel(complaint),
      severity: parsed.severity,
      assigneeId: parsed.assigneeId || null,
      subjectLine: parsed.subjectLine,
      complainantType: parsed.complainantType || null,
      complainantName: parsed.complainantName || null,
      complainantECode: parsed.complainantECode || null,
      complainantEntity: parsed.complainantEntity || null,
      complainantGrade: parsed.complainantGrade || null,
      respondentName: parsed.respondentName,
      respondentECode: parsed.respondentECode || null,
      respondentEntity: parsed.respondentEntity,
      respondentGrade: parsed.respondentGrade || null,
      city: parsed.city || null,
      state: parsed.state || null,
      hrbpSpoc: parsed.hrbpSpoc || null,
      hodName: parsed.hodName || null,
      hodEntity: parsed.hodEntity || null,
      respondentDept: parsed.respondentDept || null,
      saleNonSale: parsed.saleNonSale || null,
      categoryId: parsed.categoryId,
      subCategoryId: parsed.subCategoryId,
      tatDays: tat.tatDays,
      caseAge: tat.caseAge,
      tatBreach: tat.tatBreach,
      createdById: u.id,
    },
  });

  await recordAudit({
    entity: "Case",
    entityId: created.id,
    caseId: created.id,
    action: "CREATE",
    diff: { caseNo: { before: null, after: created.caseNo } },
    userId: u.id,
  });

  revalidatePath("/cases");
  redirect(`/cases/${created.id}`);
}

const updateSchema = intakeSchema.partial().extend({
  id: z.string().min(1),
  reportLink: z.string().optional().nullable(),
  investigationStatus: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "CLOSED", "REPORT_SENT_TO_CBO"]).optional().nullable(),
  remarks1: z.string().optional().nullable(),
  substantiated: z.preprocess((v) => (v === "" || v == null ? null : v === "true" || v === "on"), z.boolean().nullable()).optional(),
  reportStatus: z.string().optional().nullable(),
  closureDate: z.string().optional().nullable(),
  processRecApproved: z.preprocess((v) => (v === "" || v == null ? null : v === "true" || v === "on"), z.boolean().nullable()).optional(),
  employeeRecApproved: z.preprocess((v) => (v === "" || v == null ? null : v === "true" || v === "on"), z.boolean().nullable()).optional(),
  employeeActionCount: z.coerce.number().int().nonnegative().optional(),
  employeeAction: z.string().optional().nullable(),
  employeeActionStatus: z.string().optional().nullable(),
  employeeActionDate: z.string().optional().nullable(),
  processAction: z.string().optional().nullable(),
  processActionStatus: z.string().optional().nullable(),
  processActionDate: z.string().optional().nullable(),
  breachReason: z.string().optional().nullable(),
  remarks2: z.string().optional().nullable(),
});

export async function updateCase(formData: FormData) {
  const u = await user();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("BAD_REQUEST");
  const existing = await db.case.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  const allowed =
    can(u, "case:edit-any") ||
    (can(u, "case:edit-assigned") && existing.assigneeId === u.id);
  if (!allowed) throw new Error("FORBIDDEN");

  const raw = Object.fromEntries(formData);
  const parsed = updateSchema.parse(raw);

  const dateFields = ["complaintDate","escalationDate","assignDate","closureDate","employeeActionDate","processActionDate"] as const;
  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (k === "id") continue;
    if (v === undefined) continue;
    if ((dateFields as readonly string[]).includes(k)) {
      updateData[k] = toDate(v as string | null);
    } else if (v === "") {
      updateData[k] = null;
    } else {
      updateData[k] = v;
    }
  }

  // Recompute TAT if relevant fields changed
  const next = { ...existing, ...updateData };
  const tat = computeTAT({
    complaintDate: next.complaintDate as Date,
    closureDate: (next.closureDate as Date | null) ?? null,
    severity: (next.severity as string) ?? existing.severity,
  });
  updateData.tatDays = tat.tatDays;
  updateData.caseAge = tat.caseAge;
  updateData.tatBreach = tat.tatBreach;
  if (next.complaintDate instanceof Date) {
    updateData.month = monthLabel(next.complaintDate);
  }

  const updated = await db.case.update({ where: { id }, data: updateData });

  const diff = buildDiff(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  if (Object.keys(diff).length) {
    await recordAudit({
      entity: "Case",
      entityId: id,
      caseId: id,
      action: existing.investigationStatus !== updated.investigationStatus ? "STATUS_CHANGE" : "UPDATE",
      diff,
      userId: u.id,
    });
  }

  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  redirect(`/cases/${id}?saved=1`);
}

export async function assignCase(formData: FormData) {
  const u = await user();
  if (!can(u, "case:assign")) throw new Error("FORBIDDEN");
  const id = String(formData.get("id") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const existing = await db.case.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  const updated = await db.case.update({ where: { id }, data: { assigneeId, assignDate: existing.assignDate ?? new Date() } });
  await recordAudit({
    entity: "Case",
    entityId: id,
    caseId: id,
    action: "ASSIGN",
    diff: { assigneeId: { before: existing.assigneeId, after: updated.assigneeId } },
    userId: u.id,
  });
  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  redirect(`/cases/${id}?assigned=1`);
}

export async function uploadAttachment(formData: FormData) {
  const u = await user();
  const id = String(formData.get("caseId") ?? "");
  const file = formData.get("file") as File | null;
  if (!id || !file) throw new Error("BAD_REQUEST");

  const existing = await db.case.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  const allowed =
    can(u, "case:edit-any") || (can(u, "case:edit-assigned") && existing.assigneeId === u.id);
  if (!allowed) throw new Error("FORBIDDEN");

  const dir = path.resolve(process.env.STORAGE_DIR ?? "./uploads", id);
  await mkdir(dir, { recursive: true });
  const ts = Date.now();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${ts}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  const att = await db.caseAttachment.create({
    data: {
      caseId: id,
      filename: file.name,
      storageKey: path.join(id, filename),
      mimeType: file.type || "application/octet-stream",
      size: buf.byteLength,
      uploadedById: u.id,
    },
  });

  await recordAudit({
    entity: "CaseAttachment",
    entityId: att.id,
    caseId: id,
    action: "FILE_UPLOAD",
    diff: { filename: { before: null, after: file.name } },
    userId: u.id,
  });

  revalidatePath(`/cases/${id}`);
  redirect(`/cases/${id}?uploaded=1`);
}

export async function listVisibleCases(scope: "mine" | "all" = "mine") {
  const u = await user();
  const where = scope === "all" ? {} : caseVisibilityFilter(u);
  return db.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true } },
      category: { select: { name: true } },
      subCategory: { select: { name: true } },
    },
  });
}
