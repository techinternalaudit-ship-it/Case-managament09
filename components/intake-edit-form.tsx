"use client";

import { useState } from "react";
import { EcodeLookup } from "@/components/ecode-lookup";
import { SaveButton } from "@/components/save-button";
import { RespondentTable } from "@/components/respondent-table";

type Respondent = { name: string; eCode: string; entity: string; grade: string };

type CaseData = {
  id: string;
  escalationChannel: string;
  complaintDate: string;
  escalationDate: string;
  assignDate: string;
  severity: string;
  assigneeId: string;
  subjectLine: string;
  categoryId: string;
  subCategoryId: string;
  saleNonSale: string;
  complainantType: string;
  complainantName: string;
  complainantECode: string;
  complainantEntity: string;
  complainantGrade: string;
  complainantMobile: string;
  complainantEmail: string;
  respondentName: string;
  respondentECode: string;
  respondentEntity: string;
  respondentGrade: string;
  respondents: string;
  city: string;
  state: string;
  hrbpSpoc: string;
  hodName: string;
  hodEntity: string;
  respondentDept: string;
};

type Cat = { id: string; name: string; subs: { id: string; name: string }[] };

function parseRespondents(json: string): Respondent[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function IntakeEditForm({
  c,
  action,
  categories,
  investigators,
}: {
  c: CaseData;
  action: (fd: FormData) => Promise<void>;
  categories: Cat[];
  investigators: { id: string; name: string }[];
}) {
  const [extraRespondents, setExtraRespondents] = useState<Respondent[]>(() => parseRespondents(c.respondents));
  const [selectedCategoryId, setSelectedCategoryId] = useState(c.categoryId);

  const filteredSubs = categories.find((cat) => cat.id === selectedCategoryId)?.subs ?? [];

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="respondents" value={JSON.stringify(extraRespondents)} />
      <Field label="Escalation Channel">
        <select className="input" name="escalationChannel" defaultValue={c.escalationChannel}>
          <option>Employee Escalations</option><option>Whistleblower Portal</option><option>Email</option><option>Helpline</option><option>Walk-in</option><option>Anonymous</option><option>Other</option>
        </select>
      </Field>
      <Field label="Complaint Date"><input className="input" type="date" name="complaintDate" defaultValue={c.complaintDate} /></Field>
      <Field label="Escalation Date"><input className="input" type="date" name="escalationDate" defaultValue={c.escalationDate} /></Field>
      <Field label="Assign Date"><input className="input" type="date" name="assignDate" defaultValue={c.assignDate} /></Field>
      <Field label="Severity">
        <select className="input" name="severity" defaultValue={c.severity}>
          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </select>
      </Field>
      <Field label="Responsibility">
        <select className="input" name="assigneeId" defaultValue={c.assigneeId}>
          <option value="">— Unassigned —</option>
          {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Case Subject Line" className="md:col-span-3"><input className="input" name="subjectLine" defaultValue={c.subjectLine} /></Field>
      <Field label="Category">
        <select className="input" name="categoryId" defaultValue={c.categoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </Field>
      <Field label="Sub-Category">
        <select className="input" name="subCategoryId" defaultValue={c.subCategoryId} key={selectedCategoryId}>
          {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Sale / Not-Sale">
        <select className="input" name="saleNonSale" defaultValue={c.saleNonSale}>
          <option value="">—</option><option>Sale</option><option>Not Sale</option>
        </select>
      </Field>
      <Field label="Complainant Type">
        <select className="input" name="complainantType" defaultValue={c.complainantType}>
          <option value="">—</option><option>Employee</option><option>Merchant</option><option>Customer</option><option>External</option><option>Anonymous</option>
        </select>
      </Field>
      <Field label="Complainant Name"><input className="input" name="complainantName" defaultValue={c.complainantName} /></Field>
      <Field label="Complainant E-Code">
        <EcodeLookup
          inputName="complainantECode"
          placeholder="Type E-code…"
          fieldMap={{
            name: "complainantName",
            entity: "complainantEntity",
            grade: "complainantGrade",
            email: "complainantEmail",
            mobileNumber: "complainantMobile",
          }}
          defaultValue={c.complainantECode}
        />
      </Field>
      <Field label="Complainant Entity"><input className="input" name="complainantEntity" defaultValue={c.complainantEntity} /></Field>
      <Field label="Complainant Grade"><input className="input" name="complainantGrade" defaultValue={c.complainantGrade} /></Field>
      <Field label="Complainant Mobile"><input className="input" name="complainantMobile" type="tel" defaultValue={c.complainantMobile} /></Field>
      <Field label="Complainant Email"><input className="input" name="complainantEmail" type="email" defaultValue={c.complainantEmail} /></Field>

      {/* Primary respondent */}
      <div className="md:col-span-3 mt-2 mb-1">
        <div className="text-xs font-bold text-ink-500 dark:text-gray-400 uppercase tracking-wider">Primary Respondent</div>
      </div>
      <Field label="Respondent Name"><input className="input" name="respondentName" defaultValue={c.respondentName} /></Field>
      <Field label="Respondent E-Code">
        <EcodeLookup
          inputName="respondentECode"
          placeholder="Type E-code…"
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
          defaultValue={c.respondentECode}
        />
      </Field>
      <Field label="Respondent Entity"><input className="input" name="respondentEntity" defaultValue={c.respondentEntity} /></Field>
      <Field label="Respondent Grade"><input className="input" name="respondentGrade" defaultValue={c.respondentGrade} /></Field>

      {/* Additional respondents with E-code lookup */}
      <div className="md:col-span-3">
        <div className="text-xs font-bold text-ink-500 dark:text-gray-400 uppercase tracking-wider mb-2">Additional Respondent(s)</div>
        <RespondentTable respondents={extraRespondents} onChange={setExtraRespondents} />
      </div>

      <Field label="City"><input className="input" name="city" defaultValue={c.city} /></Field>
      <Field label="State"><input className="input" name="state" defaultValue={c.state} /></Field>
      <Field label="HRBP / SPOC"><input className="input" name="hrbpSpoc" defaultValue={c.hrbpSpoc} /></Field>
      <Field label="HOD of Respondent"><input className="input" name="hodName" defaultValue={c.hodName} /></Field>
      <Field label="HOD Entity"><input className="input" name="hodEntity" defaultValue={c.hodEntity} /></Field>
      <Field label="Department"><input className="input" name="respondentDept" defaultValue={c.respondentDept} /></Field>
      <div className="md:col-span-3 flex justify-end pt-2">
        <SaveButton label="Save intake details" />
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
