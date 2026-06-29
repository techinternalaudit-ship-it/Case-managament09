"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

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

export function WorkloadCharts({
  rows,
}: {
  rows: { name: string; Open: number; InProgress: number; OnHold: number; Low: number; Medium: number; High: number; Critical: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5">
        <div className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-4">Cases by Status</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={AXIS} interval={0} angle={-18} textAnchor="end" height={72} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            <Bar dataKey="Open" stackId="s" fill="#38bdf8" />
            <Bar dataKey="InProgress" stackId="s" fill="#0284c7" />
            <Bar dataKey="OnHold" stackId="s" fill="#d1d5db" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card p-5">
        <div className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-4">Severity Mix</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={AXIS} interval={0} angle={-18} textAnchor="end" height={72} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            <Bar dataKey="Low" stackId="sv" fill="#10b981" />
            <Bar dataKey="Medium" stackId="sv" fill="#f59e0b" />
            <Bar dataKey="High" stackId="sv" fill="#f97316" />
            <Bar dataKey="Critical" stackId="sv" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
