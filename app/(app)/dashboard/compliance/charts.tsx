"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

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

export function ComplianceCharts({
  tatDist,
  breachByMonth,
}: {
  tatDist: { label: string; count: number }[];
  breachByMonth: { key: string; breaches: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5">
        <div className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-4">TAT Distribution</div>
        {tatDist.length === 0 || tatDist.every((d) => d.count === 0) ? (
          <div className="h-[260px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tatDist} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="url(#tatGrad)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                <defs>
                  <linearGradient id="tatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00BAF2" />
                    <stop offset="100%" stopColor="#0080aa" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="card p-5">
        <div className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-4">Breaches Over Time</div>
        {breachByMonth.length === 0 || breachByMonth.every((d) => d.breaches === 0) ? (
          <div className="h-[260px]"><EmptyState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={breachByMonth} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="key" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="breaches" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3.5, fill: "#ef4444", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
