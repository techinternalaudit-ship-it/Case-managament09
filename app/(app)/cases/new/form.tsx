"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { EcodeLookup } from "@/components/ecode-lookup";
import { RespondentTable } from "@/components/respondent-table";

type Cat = { id: string; name: string; subs: { id: string; name: string }[] };
type Respondent = { name: string; eCode: string; entity: string; grade: string };

export function CaseIntakeForm({
  action,
  nextCaseNo,
  categories,
  investigators,
}: {
  action: (fd: FormData) => Promise<void>;
  nextCaseNo: number;
  categories: Cat[];
  investigators: { id: string; name: string }[];
}) {
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [complainantType, setComplainantType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [extraRespondents, setExtraRespondents] = useState<Respondent[]>([]);

  const subOptions = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subs ?? [],
    [categories, categoryId]
  );

  const [reviewData, setReviewData] = useState<Record<string, string>>({});

  const steps = [
    { label: "Case header", icon: "briefcase" as const },
    { label: "What / Why", icon: "search" as const },
    { label: "Complainant", icon: "user" as const },
    { label: "Respondent", icon: "users" as const },
    { label: "Where", icon: "home" as const },
    { label: "Org context", icon: "tags" as const },
    { label: "Review", icon: "check" as const },
  ];

  // Required fields per step
  const requiredByStep: Record<number, { field: string; label: string }[]> = {
    0: [
      { field: "escalationChannel", label: "Escalation Channel" },
      { field: "complaintDate", label: "Complaint Date" },
      { field: "assignDate", label: "Case Assign Date" },
      { field: "assigneeId", label: "Investigator" },
    ],
    1: [
      { field: "subjectLine", label: "Case Subject Line" },
      { field: "categoryId", label: "Category" },
      { field: "subCategoryId", label: "Sub-Category" },
      { field: "saleNonSale", label: "Sale / Not-Sale" },
    ],
    2: [
      { field: "complainantType", label: "Type of Complainant" },
    ],
    3: [
      { field: "respondentName", label: "Respondent Name" },
      { field: "respondentEntity", label: "Respondent Entity" },
    ],
    4: [],
    5: [],
  };

  const stepLabels = ["Case Header", "What / Why", "Complainant", "Respondent", "Where", "Org Context"];

  function goNext() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const missing = (requiredByStep[step] || []).filter(r => !String(fd.get(r.field) || "").trim());
    if (missing.length > 0) {
      setError(`Please fill: ${missing.map(m => m.label).join(", ")}`);
      return;
    }
    setError(null);
    setStep(s => s + 1);
  }

  function goToReview() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { data[k] = String(v); });

    // Check required fields and find which step has issues
    const missingSteps: string[] = [];
    for (let s = 0; s <= 5; s++) {
      const missing = (requiredByStep[s] || []).filter((r) => !data[r.field]?.trim());
      if (missing.length > 0) {
        missingSteps.push(`${stepLabels[s]}: ${missing.map((m) => m.label).join(", ")}`);
      }
    }

    if (missingSteps.length > 0) {
      setError("Please fill required fields:\n" + missingSteps.join("\n"));
      return;
    }

    setError(null);
    setReviewData(data);
    setStep(6);
  }

  function getLabel(key: string, val: string): string {
    if (key === "assigneeId") return investigators.find((i) => i.id === val)?.name ?? val;
    if (key === "categoryId") return categories.find((c) => c.id === val)?.name ?? val;
    if (key === "subCategoryId") {
      for (const c of categories) {
        const sub = c.subs.find((s) => s.id === val);
        if (sub) return sub.name;
      }
      return val;
    }
    return val;
  }

  return (
    <form
      ref={formRef}
      className="card p-6 space-y-6"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Stepper */}
      <div className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              i === step
                ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm"
                : i < step
                ? "bg-primary-50 text-primary-700 border border-primary-200/60"
                : "bg-ink-100/50 text-ink-500 border border-transparent hover:bg-ink-100"
            }`}
          >
            <div className={`h-5 w-5 rounded-md grid place-items-center text-[10px] ${
              i === step ? "bg-white/20 text-white" : i < step ? "bg-primary-200/50 text-primary-700" : "bg-ink-200/50 text-ink-500"
            }`}>
              <Icon name={s.icon} className="h-3 w-3" />
            </div>
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-400 font-medium">Step {step + 1} of {steps.length} — fields with * are required.</p>

      <div className={step === 0 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Case header</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Case No.*"><input className="input" name="caseNo" type="number" required defaultValue={nextCaseNo} /></Field>
          <Field label="Escalation Channel*">
            <select className="input" name="escalationChannel" required defaultValue="">
              <option value="" disabled>Select…</option>
              <option>Employee Escalations</option>
              <option>Whistleblower Portal</option>
              <option>Email</option>
              <option>Helpline</option>
              <option>Walk-in</option>
              <option>Anonymous</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Complaint Date*"><input className="input" name="complaintDate" type="date" required /></Field>
          <Field label="Escalation Date*"><input className="input" name="escalationDate" type="date" required /></Field>
          <Field label="Case Assign Date*"><input className="input" name="assignDate" type="date" required /></Field>
          <Field label="Severity*">
            <select className="input" name="severity" required defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="Responsibility (Investigator)*">
            <select className="input" name="assigneeId" required defaultValue="">
              <option value="" disabled>Select…</option>
              {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className={step === 1 ? "" : "hidden"}>
        <h2 className="section-title mb-3">What / Why</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Case Subject Line*" className="col-span-2"><input className="input" name="subjectLine" required placeholder="e.g. Data Leakage" /></Field>
          <Field label="Category*">
            <select className="input" name="categoryId" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" disabled>Select…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-Category*">
            <select className="input" name="subCategoryId" required defaultValue="">
              <option value="" disabled>Select category first…</option>
              {subOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Sale / Not-Sale*">
            <select className="input" name="saleNonSale" required defaultValue="">
              <option value="" disabled>Select…</option><option>Sale</option><option>Not Sale</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={step === 2 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Complainant (who reported)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type of Complainant*">
            <select className="input" name="complainantType" required defaultValue="" onChange={(e) => {
              const val = e.target.value;
              setComplainantType(val);
            }}>
              <option value="" disabled>Select…</option><option>Employee</option><option>Merchant</option><option>Customer</option><option>External</option><option>Anonymous</option>
            </select>
          </Field>
          {complainantType === "Employee" && (
            <Field label="E-code">
              <EcodeLookup
                inputName="complainantECode"
                placeholder="Type E-code to search…"
                fieldMap={{
                  name: "complainantName",
                  entity: "complainantEntity",
                  grade: "complainantGrade",
                  email: "complainantEmail",
                  mobileNumber: "complainantMobile",
                }}
              />
            </Field>
          )}
          <Field label="Name"><input className="input" name="complainantName" /></Field>
          {complainantType === "Employee" && (
            <>
              <Field label="Entity"><input className="input" name="complainantEntity" placeholder="OCL / PSPL / …" /></Field>
              <Field label="Grade"><input className="input" name="complainantGrade" /></Field>
            </>
          )}
          <Field label="Mobile No."><input className="input" name="complainantMobile" type="tel" placeholder="Mobile number" /></Field>
          <Field label="Email"><input className="input" name="complainantEmail" type="email" placeholder="Email address" /></Field>
          {/* Hidden fields for non-employee types to ensure form data is present */}
          {complainantType !== "Employee" && (
            <>
              <input type="hidden" name="complainantECode" value="" />
              <input type="hidden" name="complainantEntity" value="" />
              <input type="hidden" name="complainantGrade" value="" />
            </>
          )}
        </div>
      </div>

      <div className={step === 3 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Respondent(s) — who is accused</h2>
        <p className="text-xs text-ink-400 mb-3">Primary respondent details (auto-fills from E-code lookup):</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="E-code*">
            <EcodeLookup
              inputName="respondentECode"
              required
              placeholder="Type E-code to search…"
              fieldMap={{
                name: "respondentName",
                entity: "respondentEntity",
                grade: "respondentGrade",
                department: "respondentDept",
                hrbpName: "hrbpSpoc",
                hodName: "hodName",
                hodEntity: "hodEntity",
                city: "city",
                state: "state",
              }}
            />
          </Field>
          <Field label="Name*"><input className="input" name="respondentName" required /></Field>
          <Field label="Entity*"><input className="input" name="respondentEntity" required placeholder="OCL / PSPL / …" /></Field>
          <Field label="Grade"><input className="input" name="respondentGrade" /></Field>
        </div>

        {/* Additional respondents with E-code lookup */}
        <div className="mt-2">
          <p className="text-xs text-ink-400 mb-2 font-semibold">Additional Respondent(s):</p>
          <RespondentTable respondents={extraRespondents} onChange={setExtraRespondents} />
        </div>
        <input type="hidden" name="respondents" value={JSON.stringify(extraRespondents)} />
      </div>

      <div className={step === 4 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Where</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City*"><input className="input" name="city" required /></Field>
          <Field label="State*"><input className="input" name="state" required /></Field>
        </div>
      </div>

      <div className={step === 5 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Org context</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="HRBP / HR SPOC*"><input className="input" name="hrbpSpoc" required /></Field>
          <Field label="HOD of Respondent*"><input className="input" name="hodName" required /></Field>
          <Field label="HOD Entity*"><input className="input" name="hodEntity" required /></Field>
          <Field label="Department of Respondent*"><input className="input" name="respondentDept" required /></Field>
        </div>
      </div>

      <div className={step === 6 ? "" : "hidden"}>
        <h2 className="section-title mb-4">Review &amp; Confirm</h2>
        <p className="text-xs text-ink-500 dark:text-gray-400 mb-4">Review all details before creating the case. Click on any section to go back and edit.</p>

        <div className="space-y-4">
          {/* Case Header */}
          <ReviewSection title="Case Header" onEdit={() => setStep(0)}>
            <ReviewRow label="Case No." value={reviewData.caseNo} />
            <ReviewRow label="Escalation Channel" value={reviewData.escalationChannel} />
            <ReviewRow label="Complaint Date" value={reviewData.complaintDate} />
            <ReviewRow label="Escalation Date" value={reviewData.escalationDate} />
            <ReviewRow label="Case Assign Date" value={reviewData.assignDate} />
            <ReviewRow label="Severity" value={reviewData.severity} />
            <ReviewRow label="Investigator" value={getLabel("assigneeId", reviewData.assigneeId)} />
          </ReviewSection>

          {/* What / Why */}
          <ReviewSection title="What / Why" onEdit={() => setStep(1)}>
            <ReviewRow label="Subject Line" value={reviewData.subjectLine} />
            <ReviewRow label="Category" value={getLabel("categoryId", reviewData.categoryId)} />
            <ReviewRow label="Sub-Category" value={getLabel("subCategoryId", reviewData.subCategoryId)} />
            <ReviewRow label="Sale / Not-Sale" value={reviewData.saleNonSale} />
          </ReviewSection>

          {/* Complainant */}
          <ReviewSection title="Complainant" onEdit={() => setStep(2)}>
            <ReviewRow label="Type" value={reviewData.complainantType} />
            <ReviewRow label="E-code" value={reviewData.complainantECode} />
            <ReviewRow label="Name" value={reviewData.complainantName} />
            <ReviewRow label="Entity" value={reviewData.complainantEntity} />
            <ReviewRow label="Grade" value={reviewData.complainantGrade} />
            <ReviewRow label="Mobile No." value={reviewData.complainantMobile} />
            <ReviewRow label="Email" value={reviewData.complainantEmail} />
          </ReviewSection>

          {/* Respondent(s) */}
          <ReviewSection title="Respondent(s)" onEdit={() => setStep(3)}>
            <ReviewRow label="Primary E-code" value={reviewData.respondentECode} />
            <ReviewRow label="Primary Name" value={reviewData.respondentName} />
            <ReviewRow label="Primary Entity" value={reviewData.respondentEntity} />
            <ReviewRow label="Primary Grade" value={reviewData.respondentGrade} />
            {extraRespondents.map((r, i) => (
              <div key={i} className="border-t border-ink-100/40 dark:border-white/[0.04] pt-1 mt-1">
                <ReviewRow label={`Respondent ${i + 2} Name`} value={r.name} />
                <ReviewRow label={`Respondent ${i + 2} E-code`} value={r.eCode} />
                <ReviewRow label={`Respondent ${i + 2} Entity`} value={r.entity} />
                <ReviewRow label={`Respondent ${i + 2} Grade`} value={r.grade} />
              </div>
            ))}
          </ReviewSection>

          {/* Where */}
          <ReviewSection title="Location" onEdit={() => setStep(4)}>
            <ReviewRow label="City" value={reviewData.city} />
            <ReviewRow label="State" value={reviewData.state} />
          </ReviewSection>

          {/* Org Context */}
          <ReviewSection title="Org Context" onEdit={() => setStep(5)}>
            <ReviewRow label="HRBP / HR SPOC" value={reviewData.hrbpSpoc} />
            <ReviewRow label="HOD of Respondent" value={reviewData.hodName} />
            <ReviewRow label="HOD Entity" value={reviewData.hodEntity} />
            <ReviewRow label="Department" value={reviewData.respondentDept} />
          </ReviewSection>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-ink-100 pt-4">
        <button
          type="button"
          className="btn-secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          {step < 5 ? (
            <button type="button" className="btn-primary" onClick={goNext}>Next &rarr;</button>
          ) : step === 5 ? (
            <button type="button" className="btn-primary" onClick={goToReview}>Review &rarr;</button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => {
                if (!formRef.current) return;
                setError(null);
                const fd = new FormData(formRef.current);
                startTransition(async () => {
                  try {
                    await action(fd);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "Something went wrong. Check all required fields.");
                  }
                });
              }}
            >
              {pending ? "Creating…" : "Create case"}
            </button>
          )}
        </div>
      </div>
    </form>
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

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200/60 dark:border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-100/50 dark:bg-white/[0.03]">
        <h3 className="text-xs font-bold text-ink-700 dark:text-gray-300 uppercase tracking-wider">{title}</h3>
        <button type="button" onClick={onEdit} className="text-[11px] font-semibold text-primary-600 hover:text-primary-500 transition-colors">
          Edit
        </button>
      </div>
      <div className="px-4 py-2 divide-y divide-ink-100/40 dark:divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  const empty = !value || value.trim() === "";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-ink-500 dark:text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${empty ? "text-rose-400 italic" : "text-ink-900 dark:text-white"}`}>
        {empty ? "Not filled" : value}
      </span>
    </div>
  );
}
