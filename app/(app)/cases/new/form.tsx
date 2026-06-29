"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";

type Cat = { id: string; name: string; subs: { id: string; name: string }[] };

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

  const subOptions = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subs ?? [],
    [categories, categoryId]
  );

  const steps = [
    { label: "Case header", icon: "briefcase" as const },
    { label: "What / Why", icon: "search" as const },
    { label: "Complainant", icon: "user" as const },
    { label: "Respondent", icon: "users" as const },
    { label: "Where", icon: "home" as const },
    { label: "Org context", icon: "tags" as const },
  ];

  return (
    <form action={action} className="card p-6 space-y-6">
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
          <Field label="Escalation Date"><input className="input" name="escalationDate" type="date" /></Field>
          <Field label="Case Assign Date"><input className="input" name="assignDate" type="date" /></Field>
          <Field label="Severity*">
            <select className="input" name="severity" required defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="Responsibility (Investigator)">
            <select className="input" name="assigneeId" defaultValue="">
              <option value="">— Unassigned —</option>
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
          <Field label="Sale / Not-Sale">
            <select className="input" name="saleNonSale" defaultValue="">
              <option value="">—</option><option>Sale</option><option>Not Sale</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={step === 2 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Complainant (who reported)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type of Complainant">
            <select className="input" name="complainantType" defaultValue="">
              <option value="">—</option><option>Employee</option><option>External</option><option>Anonymous</option>
            </select>
          </Field>
          <Field label="Name"><input className="input" name="complainantName" /></Field>
          <Field label="E-code"><input className="input" name="complainantECode" /></Field>
          <Field label="Entity"><input className="input" name="complainantEntity" placeholder="OCL / PSPL / …" /></Field>
          <Field label="Grade"><input className="input" name="complainantGrade" /></Field>
        </div>
      </div>

      <div className={step === 3 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Respondent (who is accused)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name*"><input className="input" name="respondentName" required /></Field>
          <Field label="E-code"><input className="input" name="respondentECode" /></Field>
          <Field label="Entity*"><input className="input" name="respondentEntity" required placeholder="OCL / PSPL / …" /></Field>
          <Field label="Grade"><input className="input" name="respondentGrade" /></Field>
        </div>
      </div>

      <div className={step === 4 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Where</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><input className="input" name="city" /></Field>
          <Field label="State"><input className="input" name="state" /></Field>
        </div>
      </div>

      <div className={step === 5 ? "" : "hidden"}>
        <h2 className="section-title mb-3">Org context</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="HRBP / HR SPOC"><input className="input" name="hrbpSpoc" /></Field>
          <Field label="HOD of Respondent"><input className="input" name="hodName" /></Field>
          <Field label="HOD Entity"><input className="input" name="hodEntity" /></Field>
          <Field label="Department of Respondent"><input className="input" name="respondentDept" /></Field>
        </div>
      </div>

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
          {step < steps.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next &rarr;</button>
          ) : (
            <button type="submit" className="btn-primary">Create case</button>
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
