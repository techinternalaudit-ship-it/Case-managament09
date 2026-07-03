export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getScope } from "@/lib/scope";

export default async function WorkloadDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const scope = await getScope();
  const where = scope === "all" ? {} : caseVisibilityFilter(session.user);

  const [cases, investigators] = await Promise.all([
    db.case.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: { role: { in: ["INVESTIGATOR", "ADMIN"] }, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = investigators.map((inv) => {
    const mine = cases.filter((c) => c.assigneeId === inv.id);
    const total = mine.length;
    const inProgress = mine.filter((c) => c.investigationStatus === "IN_PROGRESS").length;
    const sentL1 = mine.filter((c) => c.investigationStatus === "PENDING_L1_REVIEW").length;
    const sentL2 = mine.filter((c) => c.investigationStatus === "PENDING_L2_REVIEW").length;
    const closed = mine.filter((c) => c.investigationStatus === "CLOSED" || c.investigationStatus === "REPORT_SENT_TO_CBO").length;
    const breached = mine.filter((c) => c.tatBreach).length;

    const openMine = mine.filter((c) => c.investigationStatus !== "CLOSED" && c.investigationStatus !== "REPORT_SENT_TO_CBO");
    const sev = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const c of openMine) {
      if (c.severity in sev) sev[c.severity as keyof typeof sev]++;
    }

    return { id: inv.id, name: inv.name, total, inProgress, sentL1, sentL2, closed, breached, sev };
  });

  rows.sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Team Workload</h1>
        <p className="page-sub">Who&apos;s working on what — at a glance.</p>
      </div>

      {/* Table 1 — Case status per investigator */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04]">
          <h2 className="text-sm font-bold text-ink-900 dark:text-white">Case Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Investigator</th>
                <th className="px-4 py-3 text-center font-semibold">Total Cases</th>
                <th className="px-4 py-3 text-center font-semibold">In Progress</th>
                <th className="px-4 py-3 text-center font-semibold">Sent for L1</th>
                <th className="px-4 py-3 text-center font-semibold">Sent for L2</th>
                <th className="px-4 py-3 text-center font-semibold">Closed</th>
                <th className="px-4 py-3 text-center font-semibold">TAT Breached</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-5 py-3.5 font-semibold">
                    <Link href={`/cases?q=${encodeURIComponent(r.name)}`} className="text-primary-700 dark:text-primary-400 hover:text-primary-500 transition-colors">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums font-bold text-ink-800 dark:text-white">{r.total}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums">{r.inProgress || <span className="text-ink-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">
                    {r.sentL1 > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">{r.sentL1}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.sentL2 > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">{r.sentL2}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.closed > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">{r.closed}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.breached > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">{r.breached}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-ink-400">No investigators yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2 — Severity breakdown per investigator */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04]">
          <h2 className="text-sm font-bold text-ink-900 dark:text-white">Severity Breakdown</h2>
          <p className="text-[11px] text-ink-400 dark:text-gray-500 mt-0.5">Open cases only</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Investigator</th>
                <th className="px-4 py-3 text-center font-semibold">Low</th>
                <th className="px-4 py-3 text-center font-semibold">Medium</th>
                <th className="px-4 py-3 text-center font-semibold">High</th>
                <th className="px-4 py-3 text-center font-semibold">Critical</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-5 py-3.5 font-semibold text-ink-800 dark:text-gray-200">{r.name}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    {r.sev.LOW > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">{r.sev.LOW}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    {r.sev.MEDIUM > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">{r.sev.MEDIUM}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    {r.sev.HIGH > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">{r.sev.HIGH}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    {r.sev.CRITICAL > 0
                      ? <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">{r.sev.CRITICAL}</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-ink-400">No investigators yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
