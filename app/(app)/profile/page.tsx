export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLE_LABELS } from "@/lib/utils";
import { changeOwnPassword } from "./actions";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const u = session.user;
  const initials = u.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const roleLabels = (u.roles || u.role || "")
    .split(",")
    .map((r) => ROLE_LABELS[r.trim()] ?? r.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">Manage your account details and password.</p>
      </div>

      <div className="card p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white grid place-items-center font-bold text-lg shadow-sm">
          {initials}
        </div>
        <div>
          <div className="text-base font-semibold text-ink-900 dark:text-white">{u.name}</div>
          <div className="text-sm text-ink-500 dark:text-gray-400">{u.email}</div>
          <div className="text-xs text-ink-400 dark:text-gray-500 font-medium mt-0.5">{roleLabels}</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4">Change Password</h2>
        <ChangePasswordForm changeOwnPassword={changeOwnPassword} />
      </div>
    </div>
  );
}
