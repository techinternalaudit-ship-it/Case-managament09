import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { formatDate, formatDateTime, severityColor, statusColor, STATUS_LABELS, STATUS_LIST } from "@/lib/utils";
import { assignCase, updateCase, uploadAttachment } from "../actions";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { SaveButton } from "@/components/save-button";

export default async function CaseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; assigned?: string; uploaded?: string }> }) {
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
          <form action={updateCase} className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <Field label="Escalation Channel">
              <select className="input" name="escalationChannel" defaultValue={c.escalationChannel}>
                <option>Employee Escalations</option><option>Whistleblower Portal</option><option>Email</option><option>Helpline</option><option>Walk-in</option><option>Anonymous</option><option>Other</option>
                {!["Employee Escalations","Whistleblower Portal","Email","Helpline","Walk-in","Anonymous","Other"].includes(c.escalationChannel) && <option>{c.escalationChannel}</option>}
              </select>
            </Field>
            <Field label="Complaint Date"><input className="input" type="date" name="complaintDate" defaultValue={c.complaintDate.toISOString().slice(0, 10)} /></Field>
            <Field label="Escalation Date"><input className="input" type="date" name="escalationDate" defaultValue={c.escalationDate ? c.escalationDate.toISOString().slice(0, 10) : ""} /></Field>
            <Field label="Assign Date"><input className="input" type="date" name="assignDate" defaultValue={c.assignDate ? c.assignDate.toISOString().slice(0, 10) : ""} /></Field>
            <Field label="Severity">
              <select className="input" name="severity" defaultValue={c.severity}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </select>
            </Field>
            <Field label="Responsibility">
              <select className="input" name="assigneeId" defaultValue={c.assigneeId ?? ""}>
                <option value="">— Unassigned —</option>
                {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Case Subject Line" className="md:col-span-3"><input className="input" name="subjectLine" defaultValue={c.subjectLine} /></Field>
            <Field label="Category">
              <select className="input" name="categoryId" defaultValue={c.categoryId}>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </Field>
            <Field label="Sub-Category">
              <select className="input" name="subCategoryId" defaultValue={c.subCategoryId}>
                {categories.flatMap((cat) => cat.subs.map((s) => <option key={s.id} value={s.id}>{cat.name} / {s.name}</option>))}
              </select>
            </Field>
            <Field label="Sale / Not-Sale">
              <select className="input" name="saleNonSale" defaultValue={c.saleNonSale ?? ""}>
                <option value="">—</option><option>Sale</option><option>Not Sale</option>
              </select>
            </Field>
            <Field label="Complainant Type">
              <select className="input" name="complainantType" defaultValue={c.complainantType ?? ""}>
                <option value="">—</option><option>Employee</option><option>External</option><option>Anonymous</option>
              </select>
            </Field>
            <Field label="Complainant Name"><input className="input" name="complainantName" defaultValue={c.complainantName ?? ""} /></Field>
            <Field label="Complainant E-Code"><input className="input" name="complainantECode" defaultValue={c.complainantECode ?? ""} /></Field>
            <Field label="Complainant Entity"><input className="input" name="complainantEntity" defaultValue={c.complainantEntity ?? ""} /></Field>
            <Field label="Complainant Grade"><input className="input" name="complainantGrade" defaultValue={c.complainantGrade ?? ""} /></Field>
            <Field label="Respondent Name"><input className="input" name="respondentName" defaultValue={c.respondentName} /></Field>
            <Field label="Respondent E-Code"><input className="input" name="respondentECode" defaultValue={c.respondentECode ?? ""} /></Field>
            <Field label="Respondent Entity"><input className="input" name="respondentEntity" defaultValue={c.respondentEntity} /></Field>
            <Field label="Respondent Grade"><input className="input" name="respondentGrade" defaultValue={c.respondentGrade ?? ""} /></Field>
            <Field label="City"><input className="input" name="city" defaultValue={c.city ?? ""} /></Field>
            <Field label="State"><input className="input" name="state" defaultValue={c.state ?? ""} /></Field>
            <Field label="HRBP / SPOC"><input className="input" name="hrbpSpoc" defaultValue={c.hrbpSpoc ?? ""} /></Field>
            <Field label="HOD of Respondent"><input className="input" name="hodName" defaultValue={c.hodName ?? ""} /></Field>
            <Field label="HOD Entity"><input className="input" name="hodEntity" defaultValue={c.hodEntity ?? ""} /></Field>
            <Field label="Department"><input className="input" name="respondentDept" defaultValue={c.respondentDept ?? ""} /></Field>
            <div className="md:col-span-3 flex justify-end pt-2">
              <SaveButton label="Save intake details" />
            </div>
          </form>
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
