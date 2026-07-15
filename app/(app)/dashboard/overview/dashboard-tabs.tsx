"use client";

import { Icon } from "@/components/icon";
import { OverviewCharts } from "./charts";

type Stats = {
  total: number;
  open: number;
  inProg: number;
  closedThisMonth: number;
  breaches: number;
  avgTat: number;
  substRate: number;
  bySeverity: { name: string; value: number }[];
  months: { key: string; intake: number; closed: number }[];
  catStatus: { name: string; NotStarted: number; InProgress: number; DraftReview: number; PendingL1: number; PendingL2: number; Closed: number }[];
  topEntities: { name: string; count: number }[];
};

const TONE_STYLES: Record<string, { bg: string; text: string; iconBg: string; iconColor: string; border: string }> = {
  gray:    { bg: "bg-white dark:bg-white/[0.03]",          text: "text-ink-900 dark:text-white",      iconBg: "bg-ink-100 dark:bg-white/[0.06]",      iconColor: "text-ink-600 dark:text-gray-400",      border: "border-ink-200/60 dark:border-white/[0.06]" },
  blue:    { bg: "bg-sky-50/50 dark:bg-sky-950/20",        text: "text-sky-900 dark:text-sky-300",    iconBg: "bg-sky-100 dark:bg-sky-900/30",        iconColor: "text-sky-600 dark:text-sky-400",        border: "border-sky-200/60 dark:border-sky-800/30" },
  indigo:  { bg: "bg-primary-50/50 dark:bg-primary-950/20",text: "text-primary-900 dark:text-primary-300",iconBg: "bg-primary-100 dark:bg-primary-900/30",iconColor: "text-primary-600 dark:text-primary-400",border: "border-primary-200/60 dark:border-primary-800/30" },
  emerald: { bg: "bg-emerald-50/50 dark:bg-emerald-950/20",text: "text-emerald-900 dark:text-emerald-300",iconBg: "bg-emerald-100 dark:bg-emerald-900/30",iconColor: "text-emerald-600 dark:text-emerald-400",border: "border-emerald-200/60 dark:border-emerald-800/30" },
  rose:    { bg: "bg-rose-50/50 dark:bg-rose-950/20",      text: "text-rose-900 dark:text-rose-300",  iconBg: "bg-rose-100 dark:bg-rose-900/30",      iconColor: "text-rose-600 dark:text-rose-400",      border: "border-rose-200/60 dark:border-rose-800/30" },
};

type IconName = React.ComponentProps<typeof Icon>["name"];

function Kpi({ icon, label, value, hint, tone = "gray" }: { icon: IconName; label: string; value: number | string; hint?: string; tone?: keyof typeof TONE_STYLES }) {
  const t = TONE_STYLES[tone];
  return (
    <div className={`kpi ${t.bg} border ${t.border}`}>
      <div className={`h-9 w-9 rounded-xl ${t.iconBg} ${t.iconColor} grid place-items-center`}>
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </div>
      <div className="kpi-label mt-3">{label}</div>
      <div className={`kpi-value ${t.text}`}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

export function DashboardTabs({
  stats,
  statusLabels,
}: {
  stats: Stats;
  statusLabels: Record<string, string>;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi icon="briefcase" label="Total Cases" value={stats.total} hint="Total in scope" />
        <Kpi icon="bookmark" label="Open" value={stats.open} hint="Not yet closed" tone="blue" />
        <Kpi icon="clock" label="In Progress" value={stats.inProg} hint="Active investigations" tone="indigo" />
        <Kpi icon="check" label="Closed This Month" value={stats.closedThisMonth} hint="Resolved this month" tone="emerald" />
        <Kpi icon="alert-circle" label="SLA Breached" value={stats.breaches} hint="Past TAT limit" tone="rose" />
        <Kpi icon="trend" label="Average TAT" value={`${stats.avgTat}d`} hint="Across closed cases" />
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 grid place-items-center">
          <Icon name="check" className="h-4 w-4" />
        </div>
        <div className="text-sm text-ink-700 dark:text-gray-300">
          Substantiation rate: <span className="font-bold text-ink-900 dark:text-white">{stats.substRate}%</span>
          <span className="text-ink-400 dark:text-gray-500 ml-1">— share of closed cases found to have merit</span>
        </div>
      </div>

      <OverviewCharts
        bySeverity={stats.bySeverity}
        months={stats.months}
        catStatus={stats.catStatus}
        topEntities={stats.topEntities}
        statusLabels={statusLabels}
      />
    </div>
  );
}
