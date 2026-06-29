export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkloadCharts } from "./charts";
import { Icon } from "@/components/icon";
import { getScope } from "@/lib/scope";

type Row = {
  id: string;
  name: string;
  total: number;
  open: number;
  inProgress: number;
  onHold: number;
  closed: number;
  closedThisMonth: number;
  breached: number;
  avgTat: number;
  oldestAgeDays: number;
  severities: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  buckets: { d0_7: number; d8_15: number; d16_30: number; d31_60: number; d60p: number };
  categories: Record<string, number>;
  loadBadge: "GREEN" | "AMBER" | "RED";
};

export default async function WorkloadDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const scope = await getScope();
  const where = scope === "all" ? {} : caseVisibilityFilter(session.user);

  const [cases, investigators] = await Promise.all([
    db.case.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } }, category: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { role: { in: ["INVESTIGATOR", "ADMIN"] }, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const rows: Row[] = investigators.map((inv) => {
    const mine = cases.filter((c) => c.assigneeId === inv.id);
    const total = mine.length;
    const open = mine.filter((c) => c.investigationStatus === "OPEN").length;
    const inProgress = mine.filter((c) => c.investigationStatus === "IN_PROGRESS").length;
    const onHold = mine.filter((c) => c.investigationStatus === "ON_HOLD").length;
    const closed = mine.filter((c) => c.investigationStatus === "CLOSED" || c.investigationStatus === "REPORT_SENT_TO_CBO").length;
    const closedThisMonth = mine.filter((c) => c.closureDate && c.closureDate.getMonth() === now.getMonth() && c.closureDate.getFullYear() === now.getFullYear()).length;
    const breached = mine.filter((c) => c.tatBreach).length;
    const withTat = mine.filter((c) => c.tatDays != null);
    const avgTat = withTat.length ? Math.round(withTat.reduce((s, c) => s + (c.tatDays ?? 0), 0) / withTat.length) : 0;
    const openMine = mine.filter((c) => c.investigationStatus !== "CLOSED");
    const oldestAgeDays = openMine.length ? Math.max(...openMine.map((c) => c.caseAge ?? 0)) : 0;

    const severities = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Row["severities"];
    for (const c of openMine) {
      if (c.severity in severities) severities[c.severity as keyof Row["severities"]]++;
    }

    const buckets = { d0_7: 0, d8_15: 0, d16_30: 0, d31_60: 0, d60p: 0 };
    for (const c of openMine) {
      const a = c.caseAge ?? 0;
      if (a <= 7) buckets.d0_7++;
      else if (a <= 15) buckets.d8_15++;
      else if (a <= 30) buckets.d16_30++;
      else if (a <= 60) buckets.d31_60++;
      else buckets.d60p++;
    }

    const categories: Record<string, number> = {};
    for (const c of mine) categories[c.category.name] = (categories[c.category.name] ?? 0) + 1;

    const openWeighted = openMine.length + breached * 2;
    const loadBadge: Row["loadBadge"] = openWeighted >= 10 ? "RED" : openWeighted >= 5 ? "AMBER" : "GREEN";

    return { id: inv.id, name: inv.name, total, open, inProgress, onHold, closed, closedThisMonth, breached, avgTat, oldestAgeDays, severities, buckets, categories, loadBadge };
  });

  rows.sort((a, b) => (b.open + b.inProgress) - (a.open + a.inProgress));

  const unassigned = cases.filter((c) => !c.assigneeId);
  const allCategories = Array.from(new Set(cases.map((c) => c.category.name))).sort();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Team Workload</h1>
        <p className="page-sub">Cases per investigator and team capacity signal.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Investigator</th>
                <th className="px-4 py-3 text-center font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Open</th>
                <th className="px-4 py-3 text-center font-semibold">In Progress</th>
                <th className="px-4 py-3 text-center font-semibold">Closed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-4 py-3 font-medium"><Link href={`/cases?q=${encodeURIComponent(r.name)}`} className="text-primary-700 dark:text-primary-400 hover:text-primary-500 transition-colors">{r.name}</Link></td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold">{r.total}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.open}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.inProgress}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.closed}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-ink-400">No investigators yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WorkloadCharts
        rows={rows.map((r) => ({
          name: r.name,
          Open: r.open,
          InProgress: r.inProgress,
          OnHold: r.onHold,
          Low: r.severities.LOW,
          Medium: r.severities.MEDIUM,
          High: r.severities.HIGH,
          Critical: r.severities.CRITICAL,
        }))}
      />

      {/* Aging heatmap */}
      <div className="card p-5 overflow-x-auto">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-600 grid place-items-center"><Icon name="clock" className="h-3.5 w-3.5" /></div>
          Open-Case Aging
        </h2>
        <table className="w-full text-xs">
          <thead className="text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Investigator</th>
              <th className="px-3 py-2 text-center font-semibold">0–7d</th>
              <th className="px-3 py-2 text-center font-semibold">8–15d</th>
              <th className="px-3 py-2 text-center font-semibold">16–30d</th>
              <th className="px-3 py-2 text-center font-semibold">31–60d</th>
              <th className="px-3 py-2 text-center font-semibold">60d+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-100 dark:border-white/[0.04] last:border-0">
                <td className="px-3 py-2 font-medium text-ink-800 dark:text-gray-200">{r.name}</td>
                <HeatCell n={r.buckets.d0_7} max={20} />
                <HeatCell n={r.buckets.d8_15} max={20} />
                <HeatCell n={r.buckets.d16_30} max={20} hot />
                <HeatCell n={r.buckets.d31_60} max={20} hot />
                <HeatCell n={r.buckets.d60p} max={20} hot />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Categories handled */}
      <div className="card p-5 overflow-x-auto">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-violet-100 text-violet-600 grid place-items-center"><Icon name="tags" className="h-3.5 w-3.5" /></div>
          Categories Handled
        </h2>
        <table className="w-full text-xs">
          <thead className="text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Investigator</th>
              {allCategories.map((c) => <th key={c} className="px-3 py-2 text-center font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-100 dark:border-white/[0.04] last:border-0">
                <td className="px-3 py-2 font-medium text-ink-800 dark:text-gray-200">{r.name}</td>
                {allCategories.map((c) => <HeatCell key={c} n={r.categories[c] ?? 0} max={10} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unassigned */}
      <div className="card p-5">
        <h2 className="section-title mb-4">
          <div className="h-6 w-6 rounded-lg bg-sky-100 text-sky-600 grid place-items-center"><Icon name="alert-circle" className="h-3.5 w-3.5" /></div>
          Unassigned Cases ({unassigned.length})
        </h2>
        {unassigned.length === 0 ? (
          <div className="text-sm text-ink-400">All cases are assigned.</div>
        ) : (
          <ul className="text-sm divide-y divide-ink-100">
            {unassigned.map((c) => (
              <li key={c.id} className="py-2.5 flex justify-between items-center">
                <span><Link href={`/cases/${c.id}`} className="text-primary-700 hover:text-primary-500 font-medium transition-colors">#{c.caseNo}</Link> — {c.subjectLine} <span className="text-[11px] text-ink-400">({c.respondentEntity})</span></span>
                <Link href={`/cases/${c.id}`} className="btn-secondary py-1.5 px-3 text-[11px]">Assign</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HeatCell({ n, max, hot }: { n: number; max: number; hot?: boolean }) {
  if (n === 0) return <td className="px-3 py-2 text-center text-ink-300 dark:text-gray-600">0</td>;
  const t = Math.min(1, n / max);
  const color = hot
    ? `rgba(239, 68, 68, ${0.12 + t * 0.65})`
    : `rgba(59, 130, 246, ${0.1 + t * 0.6})`;
  const textColor = t > 0.5 ? "#fff" : undefined;
  return <td className={`px-3 py-2 text-center font-semibold rounded ${t <= 0.5 ? "text-ink-900 dark:text-white" : ""}`} style={{ background: color, ...(textColor ? { color: textColor } : {}) }}>{n}</td>;
}
