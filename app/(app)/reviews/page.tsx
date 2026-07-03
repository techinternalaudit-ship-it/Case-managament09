import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { formatDate, severityColor, statusColor, STATUS_LABELS } from "@/lib/utils";
import { Icon } from "@/components/icon";
import Link from "next/link";

export default async function ReviewQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const u = session.user;
  const userRoles = (u.roles || u.role || "").split(",").map((r) => r.trim());

  const isL1 = userRoles.includes("REVIEWER_L1") || userRoles.includes("ADMIN");
  const isL2 = userRoles.includes("REVIEWER_L2") || userRoles.includes("ADMIN");

  if (!isL1 && !isL2) {
    return <div className="card p-6 text-ink-500">You don&apos;t have reviewer access.</div>;
  }

  // Fetch cases pending review
  const [l1Cases, l2Cases] = await Promise.all([
    isL1
      ? db.case.findMany({
          where: { investigationStatus: "PENDING_L1_REVIEW" },
          orderBy: { updatedAt: "desc" },
          include: {
            assignee: { select: { name: true } },
            category: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    isL2
      ? db.case.findMany({
          where: { investigationStatus: "PENDING_L2_REVIEW" },
          orderBy: { updatedAt: "desc" },
          include: {
            assignee: { select: { name: true } },
            category: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pending Reviews</h1>
        <p className="page-sub">Cases awaiting your review and approval.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isL1 && (
          <div className="card p-4">
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Pending L1 Review</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{l1Cases.length}</div>
          </div>
        )}
        {isL2 && (
          <div className="card p-4">
            <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Pending L2 Review</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{l2Cases.length}</div>
          </div>
        )}
        <div className="card p-4">
          <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Total Pending</div>
          <div className="text-2xl font-bold text-ink-800 dark:text-white mt-1">{l1Cases.length + l2Cases.length}</div>
        </div>
      </div>

      {/* L1 Review Queue */}
      {isL1 && (
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Icon name="clock" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">L1 Review</h2>
              <p className="text-[11px] text-ink-400 dark:text-gray-500">Cases submitted by investigators, awaiting first-level review</p>
            </div>
            <span className="ml-auto badge bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 text-xs">
              {l1Cases.length} pending
            </span>
          </div>
          {l1Cases.length === 0 ? (
            <div className="p-8 text-center text-ink-400 dark:text-gray-500">
              <Icon name="check" className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-medium">All clear — no cases pending L1 review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50/50 dark:bg-white/[0.02] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">Case</th>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Investigator</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold">Waiting</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {l1Cases.map((c) => {
                    const waitDays = c.investigatorSubmittedAt
                      ? Math.floor((Date.now() - c.investigatorSubmittedAt.getTime()) / 86400000)
                      : null;
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="px-4 py-3 font-semibold text-ink-800 dark:text-white">#{c.caseNo}</td>
                        <td className="px-4 py-3 text-ink-700 dark:text-gray-300 max-w-[250px] truncate">{c.subjectLine}</td>
                        <td className="px-4 py-3"><span className={`badge text-[11px] ${severityColor(c.severity)}`}>{c.severity}</span></td>
                        <td className="px-4 py-3 text-ink-500 dark:text-gray-400 text-xs">{c.category.name}</td>
                        <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{c.assignee?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-ink-400 dark:text-gray-500">{formatDate(c.investigatorSubmittedAt)}</td>
                        <td className="px-4 py-3">
                          {waitDays != null && (
                            <span className={`text-xs font-semibold ${waitDays > 3 ? "text-rose-600" : waitDays > 1 ? "text-amber-600" : "text-emerald-600"}`}>
                              {waitDays}d
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/cases/${c.id}`} className="btn-secondary py-1.5 px-3 text-[11px] inline-flex items-center gap-1.5">
                            Review <Icon name="arrow-right" className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* L2 Review Queue */}
      {isL2 && (
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04] flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 grid place-items-center">
              <Icon name="shield" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">L2 Review</h2>
              <p className="text-[11px] text-ink-400 dark:text-gray-500">Cases approved by L1, awaiting final review and closure</p>
            </div>
            <span className="ml-auto badge bg-orange-50 text-orange-700 ring-1 ring-orange-200/60 text-xs">
              {l2Cases.length} pending
            </span>
          </div>
          {l2Cases.length === 0 ? (
            <div className="p-8 text-center text-ink-400 dark:text-gray-500">
              <Icon name="check" className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-medium">All clear — no cases pending L2 review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50/50 dark:bg-white/[0.02] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">Case</th>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Investigator</th>
                    <th className="px-4 py-3 text-left font-semibold">L1 Approved</th>
                    <th className="px-4 py-3 text-left font-semibold">Waiting</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {l2Cases.map((c) => {
                    const waitDays = c.l1ReviewedAt
                      ? Math.floor((Date.now() - c.l1ReviewedAt.getTime()) / 86400000)
                      : null;
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="px-4 py-3 font-semibold text-ink-800 dark:text-white">#{c.caseNo}</td>
                        <td className="px-4 py-3 text-ink-700 dark:text-gray-300 max-w-[250px] truncate">{c.subjectLine}</td>
                        <td className="px-4 py-3"><span className={`badge text-[11px] ${severityColor(c.severity)}`}>{c.severity}</span></td>
                        <td className="px-4 py-3 text-ink-500 dark:text-gray-400 text-xs">{c.category.name}</td>
                        <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{c.assignee?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-ink-400 dark:text-gray-500">{formatDate(c.l1ReviewedAt)}</td>
                        <td className="px-4 py-3">
                          {waitDays != null && (
                            <span className={`text-xs font-semibold ${waitDays > 3 ? "text-rose-600" : waitDays > 1 ? "text-amber-600" : "text-emerald-600"}`}>
                              {waitDays}d
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/cases/${c.id}`} className="btn-secondary py-1.5 px-3 text-[11px] inline-flex items-center gap-1.5">
                            Review <Icon name="arrow-right" className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
