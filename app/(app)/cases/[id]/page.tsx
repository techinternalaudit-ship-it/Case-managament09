import React from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { formatDate, formatDateTime, severityColor, statusColor, STATUS_LABELS, STATUS_LIST } from "@/lib/utils";
import { assignCase, updateCase, uploadAttachment, submitForReview, reviewCase } from "../actions";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { SaveButton } from "@/components/save-button";
import { ReviewForm } from "@/components/review-form";
import { IntakeEditForm } from "@/components/intake-edit-form";

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
      l1Reviewer: { select: { name: true } },
      l2Reviewer: { select: { name: true } },
      attachments: { include: { uploadedBy: { select: { name: true } } }, orderBy: { uploadedAt: "desc" } },
      auditLogs: { include: { user: { select: { name: true } } }, orderBy: { at: "desc" }, take: 50 },
    },
  });
  if (!c) notFound();

  // View permission check
  if (!can(u, "case:view")) redirect("/cases");

  const [investigators, categories] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["INVESTIGATOR", "ADMIN"] }, active: true },
      orderBy: { name: "asc" },
    }),
    db.lookupCategory.findMany({
      include: { subs: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const canEdit = can(u, "case:edit-any") || (can(u, "case:edit-assigned") && c.assigneeId === u.id);
  const canAssign = can(u, "case:assign");

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
              respondentName: c.respondentName,
              respondentECode: c.respondentECode ?? "",
              respondentEntity: c.respondentEntity,
              respondentGrade: c.respondentGrade ?? "",
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
            <DataRow k="Respondent" v={`${c.respondentName} (${c.respondentECode ?? "—"})`} />
            <DataRow k="Respondent Entity" v={c.respondentEntity} />
            <DataRow k="Respondent Grade" v={c.respondentGrade ?? "—"} />
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
          <Field label="Report Link"><input className="input" name="reportLink" defaultValue={c.reportLink ?? ""} disabled={!canEdit} /></Field>
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

      {/* Review Journey */}
      <section className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-cyan-100 text-cyan-600 grid place-items-center"><Icon name="check" className="h-3.5 w-3.5" /></div>
          Review Journey
        </h2>

        {/* Journey map */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {[
            { key: "OPEN", label: "Open" },
            { key: "IN_PROGRESS", label: "In Progress" },
            { key: "PENDING_L1_REVIEW", label: "L1 Review" },
            { key: "PENDING_L2_REVIEW", label: "L2 Review" },
            { key: "CLOSED", label: "Closed" },
          ].map((s, i, arr) => {
            const statusOrder = ["OPEN", "IN_PROGRESS", "PENDING_L1_REVIEW", "PENDING_L2_REVIEW", "CLOSED", "REPORT_SENT_TO_CBO"];
            const currentIdx = statusOrder.indexOf(c.investigationStatus);
            const stepIdx = statusOrder.indexOf(s.key);
            const isActive = s.key === c.investigationStatus;
            const isDone = stepIdx < currentIdx || c.investigationStatus === "CLOSED" || c.investigationStatus === "REPORT_SENT_TO_CBO";
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? "bg-primary-100 text-primary-700 ring-2 ring-primary-300" : isDone ? "bg-emerald-50 text-emerald-700" : "bg-ink-100/50 text-ink-400"
                }`}>
                  {isDone && <Icon name="check" className="h-3 w-3" />}
                  {s.label}
                </div>
                {i < arr.length - 1 && <div className={`w-6 h-0.5 shrink-0 ${isDone ? "bg-emerald-300" : "bg-ink-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Performance timestamps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-3 bg-ink-50 dark:bg-white/[0.02] rounded-xl">
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Investigator Submitted</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.investigatorSubmittedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">L1 Reviewed</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.l1ReviewedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">L2 Reviewed</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDateTime(c.l2ReviewedAt)}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Case Closed</div>
            <div className="text-sm font-medium text-ink-800 dark:text-gray-300 mt-0.5">{formatDate(c.closureDate)}</div>
          </div>
        </div>

        {/* L1 Review section */}
        {c.l1ReviewStatus && (
          <div className={`p-3 rounded-xl mb-3 ${c.l1ReviewStatus === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30" : "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30"}`}>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <span className={c.l1ReviewStatus === "APPROVED" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>L1 Review: {c.l1ReviewStatus}</span>
              <span className="text-xs text-ink-400 font-normal">by {c.l1Reviewer?.name ?? "—"} · {formatDateTime(c.l1ReviewedAt)}</span>
            </div>
            {c.l1Comments && <p className="text-sm text-ink-600 dark:text-gray-400">{c.l1Comments}</p>}
          </div>
        )}

        {/* L2 Review section */}
        {c.l2ReviewStatus && (
          <div className={`p-3 rounded-xl mb-3 ${c.l2ReviewStatus === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30" : "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30"}`}>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <span className={c.l2ReviewStatus === "APPROVED" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>L2 Review: {c.l2ReviewStatus}</span>
              <span className="text-xs text-ink-400 font-normal">by {c.l2Reviewer?.name ?? "—"} · {formatDateTime(c.l2ReviewedAt)}</span>
            </div>
            {c.l2Comments && <p className="text-sm text-ink-600 dark:text-gray-400">{c.l2Comments}</p>}
          </div>
        )}

        {/* Submit for review button - for investigators when status is IN_PROGRESS */}
        {can(u, "case:submit-for-review") && c.investigationStatus === "IN_PROGRESS" && (c.assigneeId === u.id || can(u, "case:edit-any")) && (
          <form action={submitForReview} className="mt-3">
            <input type="hidden" name="id" value={c.id} />
            <SaveButton label="Submit for L1 Review →" />
          </form>
        )}

        {/* L1 Review form - for L1 reviewers when status is PENDING_L1_REVIEW */}
        {can(u, "case:review-l1") && c.investigationStatus === "PENDING_L1_REVIEW" && (
          <ReviewForm caseId={c.id} level="L1" action={reviewCase} />
        )}

        {/* L2 Review form - for L2 reviewers when status is PENDING_L2_REVIEW */}
        {can(u, "case:review-l2") && c.investigationStatus === "PENDING_L2_REVIEW" && (
          <ReviewForm caseId={c.id} level="L2" action={reviewCase} />
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
