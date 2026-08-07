"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";

export type CreateUserState = { error?: string; success?: boolean } | null;

const ROLE_OPTIONS: [string, string][] = [
  ["ADMIN", "Admin"],
  ["INVESTIGATOR", "Investigator"],
  ["REVIEWER_L1", "Reviewer (L1)"],
  ["REVIEWER_L2", "Reviewer (L2)"],
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

export function AddUserForm({
  createUser,
}: {
  createUser: (prev: CreateUserState, formData: FormData) => Promise<CreateUserState>;
}) {
  const [state, formAction, pending] = useActionState(createUser, null);

  return (
    <form action={formAction} className="card p-5">
      <h2 className="section-title mb-4">
        <div className="h-6 w-6 rounded-lg bg-primary-100 text-primary-600 grid place-items-center"><Icon name="plus" className="h-3.5 w-3.5" /></div>
        Add New User
      </h2>

      {state?.error && (
        <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <Icon name="alert-circle" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
          <Icon name="check" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>User added.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Name"><input className="input" name="name" required disabled={pending} /></Field>
        <Field label="Email"><input className="input" name="email" type="email" required disabled={pending} /></Field>
        <Field label="Password"><input className="input" name="password" type="password" required disabled={pending} /></Field>
        <Field label="Roles">
          <div className="flex flex-wrap gap-3 py-2">
            {ROLE_OPTIONS.map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="roles" value={value} className="rounded border-ink-300" disabled={pending} />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Scope Entity"><input className="input" name="scopeEntity" placeholder="optional" disabled={pending} /></Field>
        <Field label="Scope Dept"><input className="input" name="scopeDept" placeholder="optional" disabled={pending} /></Field>
      </div>

      <div className="flex justify-end mt-4">
        <button className="btn-primary" type="submit" disabled={pending}>
          <Icon name="plus" className="h-4 w-4" /> {pending ? "Adding…" : "Add user"}
        </button>
      </div>
    </form>
  );
}
