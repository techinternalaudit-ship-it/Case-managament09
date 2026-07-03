import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  INVESTIGATOR: "Investigator",
  REVIEWER_L1: "Reviewer (L1)",
  REVIEWER_L2: "Reviewer (L2)",
};

export const SEVERITY_LIST = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const STATUS_LIST = [
  "OPEN",
  "IN_PROGRESS",
  "ON_HOLD",
  "PENDING_L1_REVIEW",
  "PENDING_L2_REVIEW",
  "REPORT_SENT_TO_CBO",
  "CLOSED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  PENDING_L1_REVIEW: "Pending L1 Review",
  PENDING_L2_REVIEW: "Pending L2 Review",
  REPORT_SENT_TO_CBO: "Report sent",
  CLOSED: "Closed",
};

export function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "long" });
}

export function severityColor(sev: string) {
  return (
    {
      LOW: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
      MEDIUM: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
      HIGH: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
      CRITICAL: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    }[sev] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60"
  );
}

export function statusColor(s: string) {
  return (
    {
      OPEN: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
      IN_PROGRESS: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
      ON_HOLD: "bg-gray-100 text-gray-600 ring-1 ring-gray-200/60",
      PENDING_L1_REVIEW: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
      PENDING_L2_REVIEW: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
      REPORT_SENT_TO_CBO: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200/60",
      CLOSED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    }[s] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60"
  );
}
