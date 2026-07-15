"use client";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";

const SEV_COLORS: Record<string, string> = {
  LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444",
};

const AXIS = { fontSize: 11, fill: "#9ca3af", fontWeight: 500 };
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

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-ink-400">No data to display</div>
  );
}

export function OverviewCharts({
  bySeverity,
  months,
  catStatus,
  topEntities,
}: {
  bySeverity: { name: string; value: number }[];
  months: { key: string; intake: number; closed: number }[];
  catStatus: { name: string; NotStarted: number; InProgress: number; DraftReview: number; PendingL1: number; PendingL2: number; Closed: number }[];
  topEntities: { name: string; count: number }[];
  statusLabels: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Cases by Severity">
        {bySeverity.length === 0 || bySeverity.every((d) => d.value === 0) ? (
          <div className="h-[260px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={bySeverity}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={3}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {bySeverity.map((s) => (
                  <Cell key={s.name} fill={SEV_COLORS[s.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Monthly Intake vs Closure">
        {months.length === 0 ? (
          <div className="h-[260px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={months} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="key" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="intake" stroke="#00BAF2" strokeWidth={2.5} dot={{ r: 3.5, fill: "#00BAF2", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} name="Intake" />
              <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} name="Closed" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Category × Status">
        {catStatus.length === 0 ? (
          <div className="h-[280px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={catStatus} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-18} textAnchor="end" height={72} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
              <Bar dataKey="NotStarted" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="InProgress" stackId="a" fill="#0284c7" />
              <Bar dataKey="DraftReview" stackId="a" fill="#38bdf8" />
              <Bar dataKey="PendingL1" stackId="a" fill="#f59e0b" />
              <Bar dataKey="PendingL2" stackId="a" fill="#f97316" />
              <Bar dataKey="Closed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top Respondent Entities">
        {topEntities.length === 0 ? (
          <div className="h-[260px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topEntities} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00BAF2" />
                    <stop offset="100%" stopColor="#0080aa" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-bold text-ink-700 dark:text-gray-300 uppercase tracking-wider mb-4">{title}</div>
      {children}
    </div>
  );
}
