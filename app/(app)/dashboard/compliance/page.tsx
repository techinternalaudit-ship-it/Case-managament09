export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ComplianceCharts } from "./charts";
import { Icon } from "@/components/icon";
import { getScope } from "@/lib/scope";

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const scope = await getScope();
  const where = scope === "all" ? {} : caseVisibilityFilter(session.user);
  const cases = await db.case.findMany({ where });

  const bucketDef: { label: string; min: number; max: number }[] = [
    { label: "0–7d", min: 0, max: 7 },
    { label: "8–15d", min: 8, max: 15 },
    { label: "16–30d", min: 16, max: 30 },
    { label: "31–45d", min: 31, max: 45 },
    { label: "46–60d", min: 46, max: 60 },
    { label: "60d+", min: 61, max: 10000 },
  ];
  const tatDist = bucketDef.map((b) => ({
    label: b.label,
    count: cases.filter((c) => {
      const v = c.tatDays ?? c.caseAge ?? 0;
      return v >= b.min && v <= b.max;
    }).length,
  }));

  const now = new Date();
  const breachByMonth: { key: string; breaches: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    breachByMonth.push({ key: d.toLocaleString("en-US", { month: "short", year: "2-digit" }), breaches: 0 });
  }
  for (const c of cases) {
    if (!c.tatBreach) continue;
    const k = new Date(c.complaintDate).toLocaleString("en-US", { month: "short", year: "2-digit" });
    const idx = breachByMonth.findIndex((m) => m.key === k);
    if (idx >= 0) breachByMonth[idx].breaches++;
  }

  const approved = cases.filter((c) => c.processRecApproved && c.closureDate);
  const avgApprovalCycle = approved.length
    ? Math.round(approved.reduce((s, c) => s + Math.max(0, Math.floor((c.closureDate!.getTime() - c.createdAt.getTime()) / 86400000)), 0) / approved.length)
    : 0;

  const implemented = cases.filter((c) => c.closureDate && c.employeeActionDate);
  const avgImplLag = implemented.length
    ? Math.round(implemented.reduce((s, c) => s + Math.max(0, Math.floor((c.employeeActionDate!.getTime() - c.closureDate!.getTime()) / 86400000)), 0) / implemented.length)
    : 0;

  const breachCount = cases.filter((c) => c.tatBreach).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Compliance & SLA</h1>
        <p className="page-sub">SLA distribution, breach trend, and approval cycle times.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CompKpi icon="briefcase" label="Cases Tracked" value={cases.length} />
        <CompKpi icon="alert-circle" label="Breached" value={breachCount} tone="rose" />
        <CompKpi icon="clock" label="Avg Approval (d)" value={avgApprovalCycle} />
        <CompKpi icon="trend" label="Avg Action Lag (d)" value={avgImplLag} />
      </div>

      <ComplianceCharts tatDist={tatDist} breachByMonth={breachByMonth} />
    </div>
  );
}

function CompKpi({ icon, label, value, tone = "gray" }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: number; tone?: "gray" | "rose" }) {
  const isRose = tone === "rose";
  return (
    <div className={`kpi ${isRose ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30" : ""}`}>
      <div className={`h-8 w-8 rounded-lg ${isRose ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-ink-100 dark:bg-white/[0.06] text-ink-600 dark:text-gray-400"} grid place-items-center`}>
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="kpi-label mt-2">{label}</div>
      <div className={`kpi-value ${isRose ? "text-rose-700 dark:text-rose-400" : ""}`}>{value}</div>
    </div>
  );
}
