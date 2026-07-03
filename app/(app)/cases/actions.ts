"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can, caseVisibilityFilter, type SessionUser } from "@/lib/rbac";
import { computeTAT } from "@/lib/tat";
import { buildDiff, recordAudit } from "@/lib/audit";
import {
  notifyCaseAssigned,
  notifySubmittedForL1,
  notifyL1Approved,
  notifyL1Rejected,
  notifyL2Approved,
  notifyL2Rejected,
} from "@/lib/notifications";
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

const FIELD_LABELS: Record<string, string> = {
  caseNo: "Case No.",
  escalationChannel: "Escalation Channel",
  complaintDate: "Complaint Date",
  escalationDate: "Escalation Date",
  assignDate: "Case Assign Date",
  severity: "Severity",
  assigneeId: "Investigator",
  subjectLine: "Case Subject Line",
  complainantType: "Type of Complainant",
  complainantName: "Complainant Name",
  complainantECode: "Complainant E-code",
  complainantEntity: "Complainant Entity",
  complainantGrade: "Complainant Grade",
  respondentName: "Respondent Name",
  respondentECode: "Respondent E-code",
  respondentEntity: "Respondent Entity",
  respondentGrade: "Respondent Grade",
  city: "City",
  state: "State",
  hrbpSpoc: "HRBP / HR SPOC",
  hodName: "HOD of Respondent",
  hodEntity: "HOD Entity",
  respondentDept: "Department of Respondent",
  saleNonSale: "Sale / Not-Sale",
  categoryId: "Category",
  subCategoryId: "Sub-Category",
};

export async function createCase(formData: FormData) {
  const u = await user();
  if (!can(u, "case:create")) throw new Error("You don't have permission to create cases.");

  // Verify the session user actually exists in the DB (handles stale JWT)
  const dbUser = await db.user.findUnique({ where: { id: u.id } });
  if (!dbUser) throw new Error("Your session is stale. Please sign out and sign back in.");

  const result = intakeSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => FIELD_LABELS[issue.path[0] as string] || issue.path[0])
      .filter(Boolean);
    const unique = [...new Set(missing)];
    throw new Error(`Please fill the required fields: ${unique.join(", ")}`);
  }
  const parsed = result.data;
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

  // Notify assignee (fire-and-forget — never blocks case creation)
  if (created.assigneeId) {
    notifyCaseAssigned(created.id, created.assigneeId).catch(() => {});
  }

  revalidatePath("/cases");
  redirect(`/cases/${created.id}`);
}

const updateSchema = intakeSchema.partial().extend({
  id: z.string().min(1),
  reportLink: z.string().optional().nullable(),
  investigationStatus: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "PENDING_L1_REVIEW", "PENDING_L2_REVIEW", "CLOSED", "REPORT_SENT_TO_CBO"]).optional().nullable(),
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

  // Notify new assignee
  if (assigneeId) {
    notifyCaseAssigned(id, assigneeId).catch(() => {});
  }

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

export async function submitForReview(formData: FormData) {
  const u = await user();
  if (!can(u, "case:submit-for-review")) throw new Error("FORBIDDEN");
  const id = String(formData.get("id") ?? "");
  const existing = await db.case.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");

  await db.case.update({
    where: { id },
    data: {
      investigationStatus: "PENDING_L1_REVIEW",
      investigatorSubmittedAt: new Date(),
    },
  });

  await recordAudit({
    entity: "Case",
    entityId: id,
    caseId: id,
    action: "STATUS_CHANGE",
    diff: {
      investigationStatus: { before: existing.investigationStatus, after: "PENDING_L1_REVIEW" },
      investigatorSubmittedAt: { before: null, after: new Date().toISOString() },
    },
    userId: u.id,
  });

  // Notify L1 reviewers
  notifySubmittedForL1(id).catch(() => {});

  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  redirect(`/cases/${id}?submitted=1`);
}

export async function reviewCase(formData: FormData) {
  const u = await user();
  const id = String(formData.get("id") ?? "");
  const level = String(formData.get("level") ?? ""); // "L1" or "L2"
  const status = String(formData.get("status") ?? ""); // "APPROVED" or "REJECTED"
  const comments = String(formData.get("comments") ?? "");

  if (!id || !level || !status) throw new Error("BAD_REQUEST");

  const existing = await db.case.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");

  if (level === "L1") {
    if (!can(u, "case:review-l1")) throw new Error("FORBIDDEN");
    const updateData: Record<string, unknown> = {
      l1ReviewedAt: new Date(),
      l1ReviewStatus: status,
      l1Comments: comments || null,
      l1ReviewerId: u.id,
    };
    if (status === "APPROVED") {
      updateData.investigationStatus = "PENDING_L2_REVIEW";
    } else {
      // Rejected — send back to investigator
      updateData.investigationStatus = "IN_PROGRESS";
    }
    await db.case.update({ where: { id }, data: updateData });

    await recordAudit({
      entity: "Case",
      entityId: id,
      caseId: id,
      action: "L1_REVIEW",
      diff: {
        l1ReviewStatus: { before: existing.l1ReviewStatus, after: status },
        l1Comments: { before: existing.l1Comments, after: comments || null },
        investigationStatus: { before: existing.investigationStatus, after: status === "APPROVED" ? "PENDING_L2_REVIEW" : "IN_PROGRESS" },
      },
      userId: u.id,
    });

    // Notify based on L1 outcome
    if (status === "APPROVED") {
      notifyL1Approved(id).catch(() => {});
    } else {
      notifyL1Rejected(id).catch(() => {});
    }
  } else if (level === "L2") {
    if (!can(u, "case:review-l2")) throw new Error("FORBIDDEN");
    const updateData: Record<string, unknown> = {
      l2ReviewedAt: new Date(),
      l2ReviewStatus: status,
      l2Comments: comments || null,
      l2ReviewerId: u.id,
    };
    if (status === "APPROVED") {
      updateData.investigationStatus = "CLOSED";
      updateData.closureDate = new Date();
      // Recompute TAT
      const complaint = existing.complaintDate;
      const tat = computeTAT({ complaintDate: complaint, closureDate: new Date(), severity: existing.severity });
      updateData.tatDays = tat.tatDays;
      updateData.caseAge = tat.caseAge;
      updateData.tatBreach = tat.tatBreach;
    } else {
      // Rejected — send back to investigator
      updateData.investigationStatus = "IN_PROGRESS";
    }
    await db.case.update({ where: { id }, data: updateData });

    await recordAudit({
      entity: "Case",
      entityId: id,
      caseId: id,
      action: "L2_REVIEW",
      diff: {
        l2ReviewStatus: { before: existing.l2ReviewStatus, after: status },
        l2Comments: { before: existing.l2Comments, after: comments || null },
        investigationStatus: { before: existing.investigationStatus, after: status === "APPROVED" ? "CLOSED" : "IN_PROGRESS" },
      },
      userId: u.id,
    });

    // Notify based on L2 outcome
    if (status === "APPROVED") {
      notifyL2Approved(id).catch(() => {});
    } else {
      notifyL2Rejected(id).catch(() => {});
    }
  }

  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  redirect(`/cases/${id}?reviewed=1`);
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
