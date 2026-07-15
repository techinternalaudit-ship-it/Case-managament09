"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ---------- constants ---------- */

const FIELD_OPTIONS = [
  { value: "severity", label: "Severity" },
  { value: "status", label: "Investigation Status" },
  { value: "channel", label: "Escalation Channel" },
  { value: "entity", label: "Respondent Entity" },
  { value: "month", label: "Month" },
  { value: "saleNonSale", label: "Sale / Not-Sale" },
  { value: "complainantType", label: "Type of Complainant" },
  { value: "tatBreach", label: "TAT Breach" },
  { value: "substantiated", label: "Substantiated" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "department", label: "Department" },
  { value: "investigator", label: "Investigator" },
  { value: "category", label: "Category" },
  { value: "subCategory", label: "Sub-Category" },
] as const;

type FieldKey = (typeof FIELD_OPTIONS)[number]["value"];

const METRIC_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "avgTat", label: "Avg TAT (days)" },
  { value: "avgAge", label: "Avg Case Age (days)" },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["value"];

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "stackedBar", label: "Stacked Bar" },
  { value: "pie", label: "Pie" },
  { value: "line", label: "Line" },
] as const;

type ChartType = (typeof CHART_TYPES)[number]["value"];

const COLORS = [
  "#00BAF2",
  "#002970",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#e11d48",
  "#7c3aed",
  "#0891b2",
  "#d97706",
];

const SEVERITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUS_OPTIONS = [
  "INVESTIGATION_NOT_STARTED",
  "INCOMPLETE_DETAILS",
  "INVESTIGATION_IN_PROGRESS",
  "DRAFT_REVIEW",
  "CLOSED_WITH_MHD",
  "CLOSED_WITH_HR_SPOC",
  "PENDING_L1_REVIEW",
  "PENDING_L2_REVIEW",
  "CLOSED",
];

/* ---------- shared chart styles (matches overview/charts.tsx) ---------- */

const AXIS = { fontSize: 11, fill: "#9ca3af", fontWeight: 500 as const };
const GRID = "#f3f4f6";
const tooltipStyle = {
  contentStyle: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
    fontSize: 12,
    fontWeight: 500,
    padding: "8px 14px",
  },
  cursor: { fill: "rgba(0,186,242,0.04)" },
};
const legendStyle = { fontSize: 11, paddingTop: 12, fontWeight: 500 };

/* ---------- types ---------- */

export type CaseRow = {
  severity: string;
  status: string;
  channel: string;
  entity: string;
  month: string;
  saleNonSale: string;
  complainantType: string;
  tatBreach: string;
  substantiated: string;
  city: string;
  state: string;
  department: string;
  investigator: string;
  category: string;
  subCategory: string;
  tatDays: number;
  caseAge: number;
  complaintDate: string;
  closureDate: string | null;
};

/* ---------- aggregation helpers ---------- */

function aggregate(
  rows: CaseRow[],
  xAxis: FieldKey,
  metric: MetricKey,
  groupBy: FieldKey | "none"
): { chartData: Record<string, unknown>[]; groupKeys: string[] } {
  if (groupBy === "none") {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const key = row[xAxis];
      const entry = buckets.get(key) ?? { sum: 0, count: 0 };
      entry.count += 1;
      if (metric === "avgTat") entry.sum += row.tatDays;
      else if (metric === "avgAge") entry.sum += row.caseAge;
      buckets.set(key, entry);
    }
    const chartData = [...buckets.entries()].map(([name, { sum, count }]) => ({
      name,
      value:
        metric === "count"
          ? count
          : count > 0
            ? Math.round((sum / count) * 10) / 10
            : 0,
    }));
    return { chartData, groupKeys: ["value"] };
  }

  // grouped aggregation
  const buckets = new Map<
    string,
    Map<string, { sum: number; count: number }>
  >();
  const allGroupKeys = new Set<string>();

  for (const row of rows) {
    const xKey = row[xAxis];
    const gKey = row[groupBy];
    allGroupKeys.add(gKey);
    if (!buckets.has(xKey)) buckets.set(xKey, new Map());
    const inner = buckets.get(xKey)!;
    const entry = inner.get(gKey) ?? { sum: 0, count: 0 };
    entry.count += 1;
    if (metric === "avgTat") entry.sum += row.tatDays;
    else if (metric === "avgAge") entry.sum += row.caseAge;
    inner.set(gKey, entry);
  }

  const groupKeys = [...allGroupKeys].sort();
  const chartData = [...buckets.entries()].map(([name, inner]) => {
    const point: Record<string, unknown> = { name };
    for (const gk of groupKeys) {
      const entry = inner.get(gk);
      if (!entry) {
        point[gk] = 0;
      } else {
        point[gk] =
          metric === "count"
            ? entry.count
            : entry.count > 0
              ? Math.round((entry.sum / entry.count) * 10) / 10
              : 0;
      }
    }
    return point;
  });

  return { chartData, groupKeys };
}

/* ---------- pie label ---------- */

const RADIAN = Math.PI / 180;
function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) {
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#6b7280"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

/* ---------- main component ---------- */

export function AnalyticsBuilder({ data }: { data: CaseRow[] }) {
  const [xAxis, setXAxis] = useState<FieldKey>("severity");
  const [metric, setMetric] = useState<MetricKey>("count");
  const [groupBy, setGroupBy] = useState<FieldKey | "none">("none");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const chartRef = useRef<HTMLDivElement>(null);

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sevFilter, setSevFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // apply filters
  const filtered = useMemo(() => {
    let rows = data;
    if (dateFrom) {
      rows = rows.filter((r) => r.complaintDate >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter((r) => r.complaintDate <= dateTo);
    }
    if (sevFilter.length > 0) {
      rows = rows.filter((r) => sevFilter.includes(r.severity));
    }
    if (statusFilter.length > 0) {
      rows = rows.filter((r) => statusFilter.includes(r.status));
    }
    return rows;
  }, [data, dateFrom, dateTo, sevFilter, statusFilter]);

  // aggregate
  const { chartData, groupKeys } = useMemo(
    () => aggregate(filtered, xAxis, metric, groupBy),
    [filtered, xAxis, metric, groupBy]
  );

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? "Value";

  function toggleFilter(
    arr: string[],
    setter: (v: string[]) => void,
    val: string
  ) {
    setter(
      arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
    );
  }

  const exportImage = useCallback(() => {
    const el = chartRef.current;
    if (!el) return;
    const svg = el.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `chart-${xAxis}-${metric}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }, [xAxis, metric]);

  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = chartData.map((d) => {
      const row: Record<string, unknown> = { [FIELD_OPTIONS.find(f => f.value === xAxis)?.label ?? xAxis]: d.name };
      for (const key of groupKeys) {
        row[key] = d[key];
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chart Data");
    XLSX.writeFile(wb, `chart-${xAxis}-${metric}.xlsx`);
  }, [chartData, groupKeys, xAxis, metric]);

  return (
    <div className="space-y-4">
      {/* Config Panel */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* X-Axis */}
          <div>
            <label className="label">X-Axis</label>
            <select
              className="input"
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value as FieldKey)}
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric */}
          <div>
            <label className="label">Metric</label>
            <select
              className="input"
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Group By */}
          <div>
            <label className="label">Group By</label>
            <select
              className="input"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as FieldKey | "none")
              }
            >
              <option value="none">None</option>
              {FIELD_OPTIONS.filter((f) => f.value !== xAxis).map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type */}
          <div>
            <label className="label">Chart Type</label>
            <select
              className="input"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
            >
              {CHART_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mt-4 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center gap-1.5"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-ink-100/60 dark:border-white/[0.06] space-y-4">
            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Date From</label>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Date To</label>
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Severity multi-select */}
            <div>
              <label className="label mb-1.5">Severity</label>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleFilter(sevFilter, setSevFilter, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      sevFilter.includes(s)
                        ? "bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
                        : "bg-white dark:bg-white/[0.03] border-ink-200 dark:border-white/[0.08] text-ink-500 dark:text-gray-400 hover:border-ink-300 dark:hover:border-white/[0.12]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Status multi-select */}
            <div>
              <label className="label mb-1.5">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      toggleFilter(statusFilter, setStatusFilter, s)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      statusFilter.includes(s)
                        ? "bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
                        : "bg-white dark:bg-white/[0.03] border-ink-200 dark:border-white/[0.08] text-ink-500 dark:text-gray-400 hover:border-ink-300 dark:hover:border-white/[0.12]"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(dateFrom || dateTo || sevFilter.length > 0 || statusFilter.length > 0) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSevFilter([]);
                  setStatusFilter([]);
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats bar + export buttons */}
      <div className="flex items-center gap-4 text-xs text-ink-500 dark:text-gray-400 font-medium px-1">
        <span>
          {filtered.length} case{filtered.length !== 1 ? "s" : ""} matched
        </span>
        <span className="text-ink-300 dark:text-gray-600">|</span>
        <span>{chartData.length} categories on X-axis</span>
        {groupBy !== "none" && (
          <>
            <span className="text-ink-300 dark:text-gray-600">|</span>
            <span>{groupKeys.length} groups</span>
          </>
        )}
        <span className="flex-1" />
        {chartData.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-ink-600 dark:text-gray-300 hover:bg-ink-50 dark:hover:bg-white/[0.08] transition-all text-[11px] font-semibold"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              Export PNG
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-ink-600 dark:text-gray-300 hover:bg-ink-50 dark:hover:bg-white/[0.08] transition-all text-[11px] font-semibold"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={chartRef} className="card p-5" style={{ minHeight: 400 }}>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-ink-400 dark:text-gray-500 text-sm font-medium">
            No data to display. Try adjusting your filters.
          </div>
        ) : chartType === "pie" ? (
          <PieView
            chartData={chartData}
            groupKeys={groupKeys}
            metricLabel={metricLabel}
          />
        ) : chartType === "line" ? (
          <LineView
            chartData={chartData}
            groupKeys={groupKeys}
            metricLabel={metricLabel}
          />
        ) : (
          <BarView
            chartData={chartData}
            groupKeys={groupKeys}
            stacked={chartType === "stackedBar"}
            metricLabel={metricLabel}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- chart sub-components ---------- */

function BarView({
  chartData,
  groupKeys,
  stacked,
  metricLabel,
}: {
  chartData: Record<string, unknown>[];
  groupKeys: string[];
  stacked: boolean;
  metricLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 16, left: -8, bottom: 48 }}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={72}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{
            value: metricLabel,
            angle: -90,
            position: "insideLeft",
            offset: 16,
            style: { fontSize: 11, fill: "#9ca3af", fontWeight: 500 },
          }}
        />
        <Tooltip {...tooltipStyle} />
        {groupKeys.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        )}
        {groupKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId={stacked ? "stack" : undefined}
            fill={COLORS[i % COLORS.length]}
            radius={
              stacked && i < groupKeys.length - 1
                ? [0, 0, 0, 0]
                : [6, 6, 0, 0]
            }
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieView({
  chartData,
  groupKeys,
  metricLabel,
}: {
  chartData: Record<string, unknown>[];
  groupKeys: string[];
  metricLabel: string;
}) {
  // For pie, we only show the first metric key
  const dataKey = groupKeys[0] ?? "value";
  const pieData = chartData.map((d) => ({
    name: d.name as string,
    value: (d[dataKey] as number) ?? 0,
  }));
  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-400 dark:text-gray-500 font-medium text-center">
        {metricLabel} (Total: {total})
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
            label={renderPieLabel}
            labelLine={false}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineView({
  chartData,
  groupKeys,
  metricLabel,
}: {
  chartData: Record<string, unknown>[];
  groupKeys: string[];
  metricLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: -8, bottom: 48 }}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={72}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          label={{
            value: metricLabel,
            angle: -90,
            position: "insideLeft",
            offset: 16,
            style: { fontSize: 11, fill: "#9ca3af", fontWeight: 500 },
          }}
        />
        <Tooltip {...tooltipStyle} />
        {groupKeys.length > 1 && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        )}
        {groupKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2.5}
            dot={{
              r: 3.5,
              fill: COLORS[i % COLORS.length],
              strokeWidth: 0,
            }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
