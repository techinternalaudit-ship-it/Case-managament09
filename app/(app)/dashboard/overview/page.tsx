export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { DashboardTabs } from "./dashboard-tabs";
import { STATUS_LABELS } from "@/lib/utils";
import { getScope } from "@/lib/scope";

type CaseRow = {
  severity: string;
  investigationStatus: string;
  complaintDate: string;
  closureDate: string | null;
  tatBreach: boolean;
  tatDays: number | null;
  caseAge: number | null;
  substantiated: string | null;
  respondentEntity: string;
  categoryName: string;
};

function buildStats(cases: CaseRow[]) {
  const total = cases.length;
  const open = cases.filter((c) => c.investigationStatus !== "CLOSED").length;
  const inProg = cases.filter((c) => c.investigationStatus === "INVESTIGATION_IN_PROGRESS").length;
  const now = new Date();
  const closedThisMonth = cases.filter((c) => {
    if (!c.closureDate) return false;
    const d = new Date(c.closureDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const breaches = cases.filter((c) => c.tatBreach).length;
  const avgTat = (() => {
    const closed = cases.filter((c) => c.tatDays != null);
    if (!closed.length) return 0;
    return Math.round(closed.reduce((s, c) => s + (c.tatDays ?? 0), 0) / closed.length);
  })();
  const subst = cases.filter((c) => c.substantiated != null && c.substantiated !== "NA");
  const substRate = subst.length ? Math.round((subst.filter((c) => c.substantiated === "SUBSTANTIATED").length / subst.length) * 100) : 0;

  const bySeverity = Object.entries(
    cases.reduce<Record<string, number>>((a, c) => ((a[c.severity] = (a[c.severity] ?? 0) + 1), a), {})
  ).map(([name, value]) => ({ name, value }));

  const months: { key: string; intake: number; closed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    months.push({ key, intake: 0, closed: 0 });
  }
  for (const c of cases) {
    const intakeIdx = months.findIndex((m) => {
      const d = new Date(c.complaintDate);
      return d.toLocaleString("en-US", { month: "short", year: "2-digit" }) === m.key;
    });
    if (intakeIdx >= 0) months[intakeIdx].intake++;
    if (c.closureDate) {
      const closedIdx = months.findIndex((m) => {
        const d = new Date(c.closureDate!);
        return d.toLocaleString("en-US", { month: "short", year: "2-digit" }) === m.key;
      });
      if (closedIdx >= 0) months[closedIdx].closed++;
    }
  }

  const catMap = new Map<string, Record<string, number>>();
  for (const c of cases) {
    const m = catMap.get(c.categoryName) ?? {};
    m[c.investigationStatus] = (m[c.investigationStatus] ?? 0) + 1;
    catMap.set(c.categoryName, m);
  }
  const catStatus = [...catMap.entries()].map(([name, statuses]) => ({
    name,
    NotStarted: statuses["INVESTIGATION_NOT_STARTED"] ?? 0,
    InProgress: statuses["INVESTIGATION_IN_PROGRESS"] ?? 0,
    DraftReview: statuses["DRAFT_REVIEW"] ?? 0,
    PendingL1: statuses["PENDING_L1_REVIEW"] ?? 0,
    PendingL2: statuses["PENDING_L2_REVIEW"] ?? 0,
    Closed: (statuses["CLOSED"] ?? 0) + (statuses["CLOSED_WITH_MHD"] ?? 0) + (statuses["CLOSED_WITH_HR_SPOC"] ?? 0),
  }));

  const entityMap = new Map<string, number>();
  for (const c of cases) entityMap.set(c.respondentEntity, (entityMap.get(c.respondentEntity) ?? 0) + 1);
  const topEntities = [...entityMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return { total, open, inProg, closedThisMonth, breaches, avgTat, substRate, bySeverity, months, catStatus, topEntities };
}

function serialize(cases: { severity: string; investigationStatus: string; complaintDate: Date; closureDate: Date | null; tatBreach: boolean; tatDays: number | null; caseAge: number | null; substantiated: string | null; respondentEntity: string; category: { name: string } }[]): CaseRow[] {
  return cases.map((c) => ({
    severity: c.severity,
    investigationStatus: c.investigationStatus,
    complaintDate: c.complaintDate.toISOString(),
    closureDate: c.closureDate?.toISOString() ?? null,
    tatBreach: c.tatBreach,
    tatDays: c.tatDays,
    caseAge: c.caseAge,
    substantiated: c.substantiated,
    respondentEntity: c.respondentEntity,
    categoryName: c.category.name,
  }));
}

export default async function OverviewDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const scope = await getScope();
  const where = scope === "all" ? {} : caseVisibilityFilter(session.user);
  const include = { category: { select: { name: true } } } as const;

  const casesRaw = await db.case.findMany({ where, include });
  const stats = buildStats(serialize(casesRaw));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">
          {scope === "all" ? "Organization-wide metrics and trends." : `Metrics for cases assigned to ${session.user.name}.`}
        </p>
      </div>
      <DashboardTabs
        stats={stats}
        statusLabels={STATUS_LABELS}
      />
    </div>
  );
}
