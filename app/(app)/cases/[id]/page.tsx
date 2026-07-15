import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { can, canViewCase } from "@/lib/rbac";
import { formatDate, formatDateTime, severityColor, statusColor, reviewStatusColor, STATUS_LABELS, STATUS_LIST, REVIEW_STATUS_LABELS } from "@/lib/utils";
import { assignCase, updateCase, uploadAttachment, submitForReview, reviewCase, saveInvestigationReport } from "../actions";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { SaveButton } from "@/components/save-button";
import { ReviewForm } from "@/components/review-form";
import { IntakeEditForm } from "@/components/intake-edit-form";
import { InvestigationReportForm } from "@/components/investigation-report-form";

export default async function CaseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; assigned?: string; uploaded?: string; submitted?: string; reviewed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const u = session.user;

  const c = await db.case.findUnique({
    where: { id },
    include: {
      assignee: true,
      creator: { select: { name: true } },
      category: true,
      subCategory: true,
      l1Reviewer: { select: { id: true, name: true } },
      l2Reviewer: { select: { id: true, name: true } },
      attachments: { include: { uploadedBy: { select: { name: true } } }, orderBy: { uploadedAt: "desc" } },
      auditLogs: { include: { user: { select: { name: true } } }, orderBy: { at: "desc" }, take: 50 },
    },
  });
  if (!c) notFound();

  // View permission check: must have the case:view action AND access to this specific case
  if (!can(u, "case:view") || !canViewCase(u, c)) notFound();

  const [investigators, categories, l1Reviewers, l2Reviewers] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["INVESTIGATOR", "ADMIN"] }, active: true },
      orderBy: { name: "asc" },
    }),
    db.lookupCategory.findMany({
      include: { subs: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "REVIEWER_L1" },
          { role: "ADMIN" },
          { roles: { contains: "REVIEWER_L1" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "REVIEWER_L2" },
          { role: "ADMIN" },
          { roles: { contains: "REVIEWER_L2" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canEdit = can(u, "case:edit-any") || (can(u, "case:edit-assigned") && c.assigneeId === u.id);
  const canAssign = can(u, "case:assign");

  // Journey map steps for v2 flow
  const journeySteps = [
    { key: "INVESTIGATION_NOT_STARTED", label: "Not Started" },
    { key: "INVESTIGATION_IN_PROGRESS", label: "In Progress" },
    { key: "DRAFT_REVIEW", label: "Draft Review" },
    { key: "PENDING_L1_REVIEW", label: "L1 Review" },
    { key: "PENDING_L2_REVIEW", label: "L2 Review" },
    { key: "CLOSED", label: "Closed" },
  ];
  const statusOrder = journeySteps.map((s) => s.key);
  const currentIdx = statusOrder.indexOf(c.investigationStatus);

  // Can submit for review: investigator when status is in progress or draft review
  const canSubmitForReview = can(u, "case:submit-for-review")
    && (c.investigationStatus === "INVESTIGATION_IN_PROGRESS" || c.investigationStatus === "DRAFT_REVIEW")
    && (c.assigneeId === u.id || can(u, "case:edit-any"));

  return (
    <div className="space-y-5">
      {sp.saved && <Toast message="Case updated successfully." />}
      {sp.assigned && <Toast message="Investigator assigned successfully." />}
      {sp.uploaded && <Toast message="File uploaded successfully." />}
      {sp.submitted && <Toast message="Case submitted for L1 review." />}
      {sp.reviewed && <Toast message="Review submitted successfully." />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold text-ink-400 dark:text-gray-500 uppercase tracking-wider">Case #{c.caseNo}</div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white mt-0.5">{c.subjectLine}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge ${severityColor(c.severity)}`}>{c.severity}</span>
            <span className={`badge ${statusColor(c.investigationStatus)}`}>{STATUS_LABELS[c.investigationStatus] ?? c.investigationStatus}</span>
            {c.tatBreach && <span className="badge bg-rose-100 text-rose-700">TAT BREACH</span>}
            <span className="text-[11px] text-ink-400 dark:text-gray-500">Created {formatDate(c.createdAt)} by {c.creator.name}</span>
          </div>
        </div>
        {canAssign && (
          <form action={assignCase} className="flex items-end gap-2 shrink-0">
            <input type="hidden" name="id" value={c.id} />
            <div>
              <label className="label">Assign to</label>
              <select className="input" name="assigneeId" defaultValue={c.assigneeId ?? ""}>
                <option value="">— Unassigned —</option>
                {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <button className="btn-secondary">Update</button>
          </form>
        )}
      </div>

      {/* Intake details — editable by admin */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-primary-100 text-primary-600 grid place-items-center"><Icon name="briefcase" className="h-3.5 w-3.5" /></div>
          Intake Details
        </h2>
        {canEdit ? (
          <IntakeEditForm
            c={{
              id: c.id,
              escalationChannel: c.escalationChannel,
              complaintDate: c.complaintDate.toISOString().slice(0, 10),
              escalationDate: c.escalationDate ? c.escalationDate.toISOString().slice(0, 10) : "",
              assignDate: c.assignDate ? c.assignDate.toISOString().slice(0, 10) : "",
              severity: c.severity,
              assigneeId: c.assigneeId ?? "",
              subjectLine: c.subjectLine,
              categoryId: c.categoryId,
              subCategoryId: c.subCategoryId,
              saleNonSale: c.saleNonSale ?? "",
              complainantType: c.complainantType ?? "",
              complainantName: c.complainantName ?? "",
              complainantECode: c.complainantECode ?? "",
              complainantEntity: c.complainantEntity ?? "",
              complainantGrade: c.complainantGrade ?? "",
              complainantMobile: c.complainantMobile ?? "",
              complainantEmail: c.complainantEmail ?? "",
              respondentName: c.respondentName,
              respondentECode: c.respondentECode ?? "",
              respondentEntity: c.respondentEntity,
              respondentGrade: c.respondentGrade ?? "",
              respondents: c.respondents ?? "",
              city: c.city ?? "",
              state: c.state ?? "",
              hrbpSpoc: c.hrbpSpoc ?? "",
              hodName: c.hodName ?? "",
              hodEntity: c.hodEntity ?? "",
              respondentDept: c.respondentDept ?? "",
            }}
            action={updateCase}
            categories={categories.map((cat) => ({ id: cat.id, name: cat.name, subs: cat.subs.map((s) => ({ id: s.id, name: s.name })) }))}
            investigators={investigators.map((i) => ({ id: i.id, name: i.name }))}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            <DataRow k="Escalation Channel" v={c.escalationChannel} />
            <DataRow k="Complaint Date" v={formatDate(c.complaintDate)} />
            <DataRow k="Escalation Date" v={formatDate(c.escalationDate)} />
            <DataRow k="Assign Date" v={formatDate(c.assignDate)} />
            <DataRow k="Month" v={c.month} />
            <DataRow k="Responsibility" v={c.assignee?.name ?? "—"} />
            <DataRow k="Category" v={`${c.category.name} / ${c.subCategory.name}`} />
            <DataRow k="Sale / Not-Sale" v={c.saleNonSale ?? "—"} />
            <DataRow k="Complainant" v={`${c.complainantName ?? "—"} (${c.complainantType ?? "—"})`} />
            <DataRow k="Complainant Entity" v={c.complainantEntity ?? "—"} />
            <DataRow k="Complainant Mobile" v={c.complainantMobile ?? "—"} />
            <DataRow k="Complainant Email" v={c.complainantEmail ?? "—"} />
            <DataRow k="Primary Respondent" v={`${c.respondentName} (${c.respondentECode ?? "—"})`} />
            <DataRow k="Respondent Entity" v={c.respondentEntity} />
            <DataRow k="Respondent Grade" v={c.respondentGrade ?? "—"} />
            {(() => {
              try {
                const extra = c.respondents ? JSON.parse(c.respondents) : [];
                if (!Array.isArray(extra) || extra.length === 0) return null;
                return extra.map((r: { name?: string; eCode?: string; entity?: string; grade?: string }, i: number) => (
                  <DataRow key={i} k={`Respondent ${i + 2}`} v={`${r.name ?? "—"} (${r.eCode ?? "—"}) — ${r.entity ?? "—"}`} />
                ));
              } catch { return null; }
            })()}
            <DataRow k="City / State" v={`${c.city ?? "—"}, ${c.state ?? "—"}`} />
            <DataRow k="HRBP / SPOC" v={c.hrbpSpoc ?? "—"} />
            <DataRow k="HOD" v={`${c.hodName ?? "—"} (${c.hodEntity ?? "—"})`} />
            <DataRow k="Department" v={c.respondentDept ?? "—"} />
          </div>
        )}
      </section>

      {/* Investigation lifecycle form */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-violet-100 text-violet-600 grid place-items-center"><Icon name="clock" className="h-3.5 w-3.5" /></div>
          Investigation Lifecycle
        </h2>
        {!canEdit && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg mb-4 inline-block">Read-only access</p>}
        <form action={updateCase} className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <input type="hidden" name="id" value={c.id} />
          <Field label="Investigation Status">
            <select className="input" name="investigationStatus" defaultValue={c.investigationStatus} disabled={!canEdit}>
              {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Report Link">
            <div className="flex items-center gap-2">
              <input className="input flex-1" name="reportLink" defaultValue={c.reportLink ?? ""} placeholder="Paste Google Doc link..." disabled={!canEdit} />
              {c.reportLink && (
                <a href={c.reportLink} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 !px-3 shrink-0" title="Open report link">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          </Field>
          <Field label="Substantiated">
            <select className="input" name="substantiated" defaultValue={c.substantiated == null ? "" : c.substantiated ? "true" : "false"} disabled={!canEdit}>
              <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </Field>
          <Field label="Report Status"><input className="input" name="reportStatus" defaultValue={c.reportStatus ?? ""} disabled={!canEdit} /></Field>
          <Field label="Closure Date"><input className="input" type="date" name="closureDate" defaultValue={c.closureDate ? c.closureDate.toISOString().slice(0, 10) : ""} disabled={!canEdit} /></Field>
          <Field label="Remarks" className="md:col-span-3"><textarea className="input" rows={2} name="remarks1" defaultValue={c.remarks1 ?? ""} disabled={!canEdit} /></Field>

          <Field label="Process Rec Approved">
            <select className="input" name="processRecApproved" defaultValue={c.processRecApproved == null ? "" : c.processRecApproved ? "true" : "false"} disabled={!canEdit}>
              <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </Field>
          <Field label="Employee Rec Approved">
            <select className="input" name="employeeRecApproved" defaultValue={c.employeeRecApproved == null ? "" : c.employeeRecApproved ? "true" : "false"} disabled={!canEdit}>
              <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
            </select>
          </Field>
          <Field label="Employee Action Count"><input className="input" type="number" min={0} name="employeeActionCount" defaultValue={c.employeeActionCount} disabled={!canEdit} /></Field>

          <Field label="Employee Action"><input className="input" name="employeeAction" defaultValue={c.employeeAction ?? ""} disabled={!canEdit} /></Field>
          <Field label="Employee Action Status"><input className="input" name="employeeActionStatus" defaultValue={c.employeeActionStatus ?? ""} disabled={!canEdit} /></Field>
          <Field label="Employee Action Date"><input className="input" type="date" name="employeeActionDate" defaultValue={c.employeeActionDate ? c.employeeActionDate.toISOString().slice(0, 10) : ""} disabled={!canEdit} /></Field>

          <Field label="Process Action"><input className="input" name="processAction" defaultValue={c.processAction ?? ""} disabled={!canEdit} /></Field>
          <Field label="Process Action Status"><input className="input" name="processActionStatus" defaultValue={c.processActionStatus ?? ""} disabled={!canEdit} /></Field>
          <Field label="Process Action Date"><input className="input" type="date" name="processActionDate" defaultValue={c.processActionDate ? c.processActionDate.toISOString().slice(0, 10) : ""} disabled={!canEdit} /></Field>

          <Field label="Breach Reason" className="md:col-span-2"><input className="input" name="breachReason" defaultValue={c.breachReason ?? ""} disabled={!canEdit} /></Field>
          <Field label="TAT / Age / Breach">
            <div className="text-sm py-2.5 font-semibold tabular-nums">{c.tatDays ?? "—"}d TAT &middot; {c.caseAge ?? "—"}d age &middot; {c.tatBreach ? <span className="text-rose-600">BREACHED</span> : <span className="text-emerald-600">OK</span>}</div>
          </Field>
          <Field label="Remarks 2" className="md:col-span-3"><textarea className="input" rows={2} name="remarks2" defaultValue={c.remarks2 ?? ""} disabled={!canEdit} /></Field>

          {canEdit && (
            <div className="md:col-span-3 flex justify-end pt-2">
              <SaveButton label="Save changes" />
            </div>
          )}
        </form>
      </section>

      {/* Investigation Report (structured form) */}
      {canEdit && (
        <section className="card p-5">
          <h2 className="section-title mb-4">
            <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-600 grid place-items-center"><Icon name="briefcase" className="h-3.5 w-3.5" /></div>
            Investigation Report
          </h2>
          <p className="text-xs text-ink-400 dark:text-gray-500 mb-4">
            Fill in the structured investigation report below. This data is saved with the case and can be used alongside the external report link above.
          </p>
          <InvestigationReportForm
            caseId={c.id}
            escalationChannel={c.escalationChannel}
            escalationDate={c.escalationDate ? formatDate(c.escalationDate) : "—"}
            defaultReport={c.investigationReport ?? undefined}
            onSave={saveInvestigationReport}
          />
        </section>
      )}

      {/* Review Journey */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-cyan-100 text-cyan-600 grid place-items-center"><Icon name="check" className="h-3.5 w-3.5" /></div>
          Review Journey
        </h2>

        {/* Journey map */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {journeySteps.map((s, i, arr) => {
            const stepIdx = statusOrder.indexOf(s.key);
            const isActive = s.key === c.investigationStatus;
            // Handle special closed statuses
            const isSpecialClosed = ["CLOSED_WITH_MHD", "CLOSED_WITH_HR_SPOC", "INCOMPLETE_DETAILS"].includes(c.investigationStatus);
            const isDone = (stepIdx < currentIdx) || c.investigationStatus === "CLOSED" || (isSpecialClosed && s.key === "CLOSED");
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300" : isDone ? "bg-emerald-50 text-emerald-700" : "bg-ink-100/50 text-ink-400"
                }`}>
                  {isDone && !isActive && <Icon name="check" className="h-3 w-3" />}
                  {s.label}
                </div>
                {i < arr.length - 1 && <div className={`w-6 h-0.5 shrink-0 ${isDone && !isActive ? "bg-emerald-300" : "bg-ink-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Performance timestamps */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-3 bg-ink-50 dark:bg-white/[0.02] rounded-xl">
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Investigation Started</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.investigationStartedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Submitted for Review</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.investigatorSubmittedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">L1 Review Started</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.l1ReviewStartedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">L2 Review Started</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.l2ReviewStartedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Case Closed</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDate(c.closureDate)}</div>
          </div>
        </div>

        {/* L1 Review section */}
        {c.l1ReviewStatus && (
          <div className={`p-3 rounded-xl mb-3 border ${
            c.l1ReviewStatus === "COMPLETED"
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30"
              : c.l1ReviewStatus === "CORRECTIONS_REQUIRED"
              ? "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30"
              : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
          }`}>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <span className={`badge text-xs ${reviewStatusColor(c.l1ReviewStatus)}`}>
                L1: {REVIEW_STATUS_LABELS[c.l1ReviewStatus] ?? c.l1ReviewStatus}
              </span>
              <span className="text-xs text-ink-400 font-normal">by {c.l1Reviewer?.name ?? "—"} &middot; {formatDateTime(c.l1ReviewedAt)}</span>
            </div>
            {c.l1Comments && <p className="text-sm text-ink-600 dark:text-gray-400 mt-1">{c.l1Comments}</p>}
          </div>
        )}

        {/* L2 Review section */}
        {c.l2ReviewStatus && (
          <div className={`p-3 rounded-xl mb-3 border ${
            c.l2ReviewStatus === "COMPLETED"
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30"
              : c.l2ReviewStatus === "CORRECTIONS_REQUIRED"
              ? "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30"
              : "bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/30"
          }`}>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <span className={`badge text-xs ${reviewStatusColor(c.l2ReviewStatus)}`}>
                L2: {REVIEW_STATUS_LABELS[c.l2ReviewStatus] ?? c.l2ReviewStatus}
              </span>
              <span className="text-xs text-ink-400 font-normal">by {c.l2Reviewer?.name ?? "—"} &middot; {formatDateTime(c.l2ReviewedAt)}</span>
            </div>
            {c.l2Comments && <p className="text-sm text-ink-600 dark:text-gray-400 mt-1">{c.l2Comments}</p>}
          </div>
        )}

        {/* Submit for review — investigator picks an L1 reviewer */}
        {canSubmitForReview && (
          <form action={submitForReview} className="mt-3 p-4 rounded-xl border border-primary-200/60 dark:border-primary-800/30 bg-primary-50/50 dark:bg-primary-900/10">
            <input type="hidden" name="id" value={c.id} />
            <div className="text-sm font-semibold text-ink-800 dark:text-white mb-3">Submit for L1 Review</div>
            <div className="mb-3">
              <label className="label">Select L1 Reviewer</label>
              <select className="input" name="l1ReviewerId" required>
                <option value="">— Select a reviewer —</option>
                {l1Reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <SaveButton label="Submit for L1 Review" />
          </form>
        )}

        {/* L1 Review form - for L1 reviewers when status is PENDING_L1_REVIEW */}
        {can(u, "case:review-l1") && c.investigationStatus === "PENDING_L1_REVIEW" && (
          <ReviewForm
            caseId={c.id}
            level="L1"
            action={reviewCase}
            reviewers={l2Reviewers}
            currentReviewStatus={c.l1ReviewStatus ?? undefined}
          />
        )}

        {/* L2 Review form - for L2 reviewers when status is PENDING_L2_REVIEW */}
        {can(u, "case:review-l2") && c.investigationStatus === "PENDING_L2_REVIEW" && (
          <ReviewForm
            caseId={c.id}
            level="L2"
            action={reviewCase}
            currentReviewStatus={c.l2ReviewStatus ?? undefined}
          />
        )}
      </section>

      {/* Attachments */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-600 grid place-items-center"><Icon name="upload" className="h-3.5 w-3.5" /></div>
          Attachments ({c.attachments.length})
        </h2>
        {canEdit && (
          <form action={uploadAttachment} className="flex items-end gap-2 mb-4">
            <input type="hidden" name="caseId" value={c.id} />
            <div className="flex-1"><label className="label">Upload file</label><input className="input" type="file" name="file" required /></div>
            <button className="btn-secondary">Upload</button>
          </form>
        )}
        <ul className="text-sm divide-y divide-ink-100">
          {c.attachments.map((a) => (
            <li key={a.id} className="py-2.5 flex justify-between items-center">
              <span>
                <a className="text-primary-700 hover:text-primary-500 font-medium transition-colors" href={`/api/attachments/${a.id}`}>{a.filename}</a>
                <span className="text-[11px] text-ink-400 ml-2">({Math.round(a.size / 1024)} KB &middot; {a.mimeType})</span>
              </span>
              <span className="text-[11px] text-ink-400">{a.uploadedBy.name} &middot; {formatDateTime(a.uploadedAt)}</span>
            </li>
          ))}
          {c.attachments.length === 0 && <li className="py-3 text-ink-400 text-sm">No attachments yet.</li>}
        </ul>
      </section>

      {/* Audit log */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-ink-100 text-ink-600 grid place-items-center"><Icon name="history" className="h-3.5 w-3.5" /></div>
          Audit Log
        </h2>
        <ul className="space-y-3">
          {c.auditLogs.map((l) => {
            let diff: Record<string, { before: unknown; after: unknown }> = {};
            try { diff = JSON.parse(l.diff); } catch {}
            return (
              <li key={l.id} className="border-l-2 border-primary-200 pl-3">
                <div className="text-[11px] text-ink-400 flex items-center gap-1.5">
                  <span>{formatDateTime(l.at)}</span>
                  <span>&middot;</span>
                  <span className="font-medium text-ink-600">{l.user.name}</span>
                  <span>&middot;</span>
                  <span className="font-semibold text-ink-700 bg-ink-100 px-1.5 py-0.5 rounded">{l.action}</span>
                </div>
                <ul className="text-xs mt-1 space-y-0.5">
                  {Object.entries(diff).map(([k, v]) => (
                    <li key={k}>
                      <span className="text-ink-500">{k}:</span>{" "}
                      <span className="text-ink-400 line-through">{String(v.before ?? "—")}</span>
                      {" → "}
                      <span className="text-ink-900 font-medium">{String(v.after ?? "—")}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          {c.auditLogs.length === 0 && <li className="text-ink-400 text-sm">No audit entries yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function DataRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-ink-400 dark:text-gray-500 font-medium uppercase tracking-wide">{k}</div>
      <div className="text-sm font-medium text-ink-900 dark:text-gray-200 mt-0.5">{v}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
