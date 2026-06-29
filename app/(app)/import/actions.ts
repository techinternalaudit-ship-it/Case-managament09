"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { computeTAT } from "@/lib/tat";
import { recordAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";

const headerMap: Record<string, string> = {
  "case no.": "caseNo",
  "case no": "caseNo",
  "escalation channel": "escalationChannel",
  "complaint date": "complaintDate",
  "escalation date": "escalationDate",
  "case assign date": "assignDate",
  "month": "month",
  "severity": "severity",
  "responsibilty": "responsibility",
  "responsibility": "responsibility",
  "case subject line (as per email)": "subjectLine",
  "case subject line": "subjectLine",
  "type of complainant": "complainantType",
  "name of complainant": "complainantName",
  "complainant e-code": "complainantECode",
  "complainant entity": "complainantEntity",
  "complainant grade": "complainantGrade",
  "name of respondent": "respondentName",
  "respondent e-code": "respondentECode",
  "respondent entity": "respondentEntity",
  "respondent grade": "respondentGrade",
  "city": "city",
  "city (city where fraud has occurred)": "city",
  "state": "state",
  "state (state where fraud has occurred)": "state",
  "hrbp / hrspoc of respondent": "hrbpSpoc",
  "hod of respondent": "hodName",
  "hod entity": "hodEntity",
  "department of respondent": "respondentDept",
  "sale/not - sale": "saleNonSale",
  "category": "category",
  "sub-category": "subCategory",
  "investigation report link": "reportLink",
  "investigation status": "investigationStatus",
  "remarks 1": "remarks1",
  "substantiated ( yes or no)": "substantiated",
  "substantiated": "substantiated",
  "report status": "reportStatus",
  "final report sharing date with dc, chro & cbo / closure date": "closureDate",
  "closure date": "closureDate",
  "process recommendation approved by dc": "processRecApproved",
  "employee recommendation approved by dc": "employeeRecApproved",
  "employee related count": "employeeActionCount",
  "employee related action": "employeeAction",
  "employee related action status": "employeeActionStatus",
  "employee action implementation date": "employeeActionDate",
  "process related action": "processAction",
  "process related action status": "processActionStatus",
  "process action implementation date": "processActionDate",
  "tat (in days)": "tatDays",
  "case age": "caseAge",
  "investigation tat breach": "tatBreach",
  "reason for missing tat": "breachReason",
  "remarks 2": "remarks2",
};

const STATUS_MAP: Record<string, string> = {
  "open": "OPEN",
  "investigation in progress": "IN_PROGRESS",
  "in progress": "IN_PROGRESS",
  "in_progress": "IN_PROGRESS",
  "on hold": "ON_HOLD",
  "on_hold": "ON_HOLD",
  "closed": "CLOSED",
  "report sent to cbo": "REPORT_SENT_TO_CBO",
  "report_sent_to_cbo": "REPORT_SENT_TO_CBO",
};

const SEVERITY_MAP: Record<string, string> = {
  "low": "LOW", "medium": "MEDIUM", "high": "HIGH", "critical": "CRITICAL",
};

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function asBool(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  const s = norm(v);
  if (s === "yes" || s === "true" || s === "y" || s === "substantiated") return true;
  if (s === "no" || s === "false" || s === "n" || s === "not substantiated") return false;
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
function asDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  const s = String(v).trim();
  // Try DD-MMM-YY / DD-MMM-YYYY / D-MMM-YY
  const m = s.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,4})[-/\s](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    let year = Number(m[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (month != null) return new Date(Date.UTC(year, month, day));
  }
  // Try DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m2) {
    const day = Number(m2[1]);
    const month = Number(m2[2]) - 1;
    let year = Number(m2[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return new Date(Date.UTC(year, month, day));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function asInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function importExcel(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (!can(session.user, "case:import")) throw new Error("FORBIDDEN");

  const file = formData.get("file") as File | null;
  if (!file) redirect("/import?err=no-file");

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    // Build header → field map for this sheet (case-insensitive)
    const allInvestigators = await db.user.findMany({ where: { role: { in: ["INVESTIGATOR", "ADMIN"] } } });
    const investigatorByName = new Map<string, string>();
    for (const i of allInvestigators) investigatorByName.set(i.name.toLowerCase(), i.id);

    const categories = await db.lookupCategory.findMany({ include: { subs: true } });
    const catByName = new Map<string, typeof categories[number]>();
    for (const c of categories) catByName.set(c.name.toLowerCase(), c);

    let inserted = 0;

    for (const row of rows) {
      // Normalize to internal field names
      const r: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        const field = headerMap[norm(k)];
        if (field) r[field] = v;
      }

      const caseNo = asInt(r.caseNo);
      if (!caseNo) continue;
      // Skip if exists
      const exists = await db.case.findUnique({ where: { caseNo } });
      if (exists) continue;

      const complaintDate = asDate(r.complaintDate);
      if (!complaintDate) continue;

      const severity = SEVERITY_MAP[norm(r.severity)] ?? "MEDIUM";
      const respondentName = String(r.respondentName ?? "").trim() || "Unknown";
      const respondentEntity = String(r.respondentEntity ?? "").trim() || "Unknown";

      // Resolve category / subcategory (create on the fly if missing)
      const catName = String(r.category ?? "").trim() || "Employee Concerns";
      let cat = catByName.get(catName.toLowerCase());
      if (!cat) {
        const created = await db.lookupCategory.create({ data: { name: catName } });
        cat = { ...created, subs: [] };
        catByName.set(catName.toLowerCase(), cat);
      }
      const subName = String(r.subCategory ?? "").trim() || "Others";
      let sub = cat.subs.find((s) => s.name.toLowerCase() === subName.toLowerCase());
      if (!sub) {
        sub = await db.lookupSubCategory.create({ data: { name: subName, categoryId: cat.id } });
        cat.subs.push(sub);
      }

      const assigneeId = investigatorByName.get(String(r.responsibility ?? "").trim().toLowerCase()) ?? null;
      const closureDate = asDate(r.closureDate);
      const tat = computeTAT({ complaintDate, closureDate, severity });

      const created = await db.case.create({
        data: {
          caseNo,
          escalationChannel: String(r.escalationChannel ?? "Other"),
          complaintDate,
          escalationDate: asDate(r.escalationDate),
          assignDate: asDate(r.assignDate),
          month: complaintDate.toLocaleString("en-US", { month: "long" }),
          severity,
          assigneeId,
          subjectLine: String(r.subjectLine ?? "(Imported)"),
          complainantType: r.complainantType ? String(r.complainantType) : null,
          complainantName: r.complainantName ? String(r.complainantName) : null,
          complainantECode: r.complainantECode != null ? String(r.complainantECode) : null,
          complainantEntity: r.complainantEntity ? String(r.complainantEntity) : null,
          complainantGrade: r.complainantGrade ? String(r.complainantGrade) : null,
          respondentName,
          respondentECode: r.respondentECode != null ? String(r.respondentECode) : null,
          respondentEntity,
          respondentGrade: r.respondentGrade ? String(r.respondentGrade) : null,
          city: r.city ? String(r.city) : null,
          state: r.state ? String(r.state) : null,
          hrbpSpoc: r.hrbpSpoc ? String(r.hrbpSpoc) : null,
          hodName: r.hodName ? String(r.hodName) : null,
          hodEntity: r.hodEntity ? String(r.hodEntity) : null,
          respondentDept: r.respondentDept ? String(r.respondentDept) : null,
          saleNonSale: r.saleNonSale ? String(r.saleNonSale) : null,
          categoryId: cat.id,
          subCategoryId: sub.id,
          reportLink: r.reportLink ? String(r.reportLink) : null,
          investigationStatus: STATUS_MAP[norm(r.investigationStatus)] ?? (closureDate ? "CLOSED" : "OPEN"),
          remarks1: r.remarks1 ? String(r.remarks1) : null,
          substantiated: asBool(r.substantiated),
          reportStatus: r.reportStatus ? String(r.reportStatus) : null,
          closureDate,
          processRecApproved: asBool(r.processRecApproved),
          employeeRecApproved: asBool(r.employeeRecApproved),
          employeeActionCount: asInt(r.employeeActionCount) ?? 0,
          employeeAction: r.employeeAction ? String(r.employeeAction) : null,
          employeeActionStatus: r.employeeActionStatus ? String(r.employeeActionStatus) : null,
          employeeActionDate: asDate(r.employeeActionDate),
          processAction: r.processAction ? String(r.processAction) : null,
          processActionStatus: r.processActionStatus ? String(r.processActionStatus) : null,
          processActionDate: asDate(r.processActionDate),
          tatDays: tat.tatDays,
          caseAge: tat.caseAge,
          tatBreach: tat.tatBreach,
          breachReason: r.breachReason ? String(r.breachReason) : null,
          remarks2: r.remarks2 ? String(r.remarks2) : null,
          createdById: session.user.id,
        },
      });

      await recordAudit({
        entity: "Case",
        entityId: created.id,
        caseId: created.id,
        action: "CREATE",
        diff: { source: { before: null, after: "EXCEL_IMPORT" }, caseNo: { before: null, after: created.caseNo } },
        userId: session.user.id,
      });
      inserted++;
    }

    redirect(`/import?ok=1&n=${inserted}`);
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    const msg = (e as Error).message ?? "unknown";
    redirect(`/import?err=${encodeURIComponent(msg)}`);
  }
}
