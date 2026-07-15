export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { createUser, toggleUserActive, updateUserRoles, resolvePasswordReset, dismissPasswordReset } from "./actions";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import { DeleteButton } from "./delete-button";
import { Icon } from "@/components/icon";

export default async function UsersAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!can(session.user, "user:manage")) return <div className="card p-6">Forbidden.</div>;

  const [users, pendingResets] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" } }),
    db.passwordResetRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Users</h1>
        <p className="page-sub">Manage team members and their access roles.</p>
      </div>

      {/* Password reset requests */}
      {pendingResets.length > 0 && (
        <div className="card p-5 border-l-4 border-amber-400">
          <h2 className="section-title mb-4">
            <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-600 grid place-items-center"><Icon name="alert-circle" className="h-3.5 w-3.5" /></div>
            Password Reset Requests
            <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">{pendingResets.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingResets.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-ink-50/50 border border-ink-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 grid place-items-center text-xs font-bold">
                    {req.user.name.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink-800">{req.user.name}</div>
                    <div className="text-xs text-ink-400">{req.user.email} · {formatDate(req.requestedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={resolvePasswordReset} className="flex items-center gap-2">
                    <input type="hidden" name="requestId" value={req.id} />
                    <input
                      type="password"
                      name="newPassword"
                      required
                      placeholder="New password"
                      className="input py-1.5 px-2.5 text-xs w-32"
                    />
                    <button className="btn-primary py-1.5 px-3 text-xs gap-1">
                      <Icon name="check" className="h-3 w-3" /> Reset
                    </button>
                  </form>
                  <form action={dismissPasswordReset}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <button className="btn-secondary py-1.5 px-3 text-xs text-ink-500 hover:text-ink-700">
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add user form */}
      <form action={createUser} className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-primary-100 text-primary-600 grid place-items-center"><Icon name="plus" className="h-3.5 w-3.5" /></div>
          Add New User
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Name"><input className="input" name="name" required /></Field>
          <Field label="Email"><input className="input" name="email" type="email" required /></Field>
          <Field label="Password"><input className="input" name="password" type="password" required /></Field>
          <Field label="Roles">
            <div className="flex flex-wrap gap-3 py-2">
              {[
                ["ADMIN", "Admin"],
                ["INVESTIGATOR", "Investigator"],
                ["REVIEWER_L1", "Reviewer (L1)"],
                ["REVIEWER_L2", "Reviewer (L2)"],
              ].map(([value, label]) => (
                <label key={value} className="inline-flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="roles" value={value} className="rounded border-ink-300" />
                  {label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Scope Entity"><input className="input" name="scopeEntity" placeholder="optional" /></Field>
          <Field label="Scope Dept"><input className="input" name="scopeDept" placeholder="optional" /></Field>
        </div>
        <div className="flex justify-end mt-4"><button className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Add user</button></div>
      </form>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Roles</th>
                <th className="px-4 py-3 text-left font-semibold">Scope</th>
                <th className="px-4 py-3 text-left font-semibold">Active</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <form action={updateUserRoles} className="space-y-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ["ADMIN", "Admin"],
                          ["INVESTIGATOR", "Investigator"],
                          ["REVIEWER_L1", "L1"],
                          ["REVIEWER_L2", "L2"],
                        ].map(([value, label]) => (
                          <label key={value} className="inline-flex items-center gap-1 text-xs">
                            <input type="checkbox" name="roles" value={value} defaultChecked={(u.roles || u.role || "").includes(value)} className="rounded border-ink-300 h-3.5 w-3.5" />
                            {label}
                          </label>
                        ))}
                      </div>
                      <button className="btn-secondary py-1 px-2 text-[10px]">Save</button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-gray-500">{u.scopeEntity ?? "—"} / {u.scopeDept ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.active
                      ? <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">Active</span>
                      : <span className="badge bg-ink-100 text-ink-500 ring-1 ring-ink-200/60">Inactive</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <form action={toggleUserActive} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors">{u.active ? "Deactivate" : "Activate"}</button>
                    </form>
                    <DeleteButton userId={u.id} userName={u.name} currentUserId={session.user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
