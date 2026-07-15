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
  "INVESTIGATION_NOT_STARTED",
  "INCOMPLETE_DETAILS",
  "INVESTIGATION_IN_PROGRESS",
  "DRAFT_REVIEW",
  "CLOSED_WITH_MHD",
  "CLOSED_WITH_HR_SPOC",
  "PENDING_L1_REVIEW",
  "PENDING_L2_REVIEW",
  "CLOSED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  INVESTIGATION_NOT_STARTED: "Investigation not started yet",
  INCOMPLETE_DETAILS: "Incomplete details unable to proceed",
  INVESTIGATION_IN_PROGRESS: "Investigation in Progress",
  DRAFT_REVIEW: "Draft Review",
  CLOSED_WITH_MHD: "Closed with MHD",
  CLOSED_WITH_HR_SPOC: "Closed with HR SPOC",
  PENDING_L1_REVIEW: "Pending L1 Review",
  PENDING_L2_REVIEW: "Pending L2 Review",
  CLOSED: "Closed",
};

export const REVIEW_STATUS_LIST = [
  "REVIEW_NOT_STARTED",
  "REVIEW_IN_PROGRESS",
  "CORRECTIONS_REQUIRED",
  "CORRECTIONS_COMPLETED",
  "COMPLETED",
] as const;

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  REVIEW_NOT_STARTED: "Review not started yet",
  REVIEW_IN_PROGRESS: "Review in Progress",
  CORRECTIONS_REQUIRED: "Draft Review - Corrections Required",
  CORRECTIONS_COMPLETED: "Draft Review - Corrections Completed",
  COMPLETED: "Completed",
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
      INVESTIGATION_NOT_STARTED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200/60",
      INCOMPLETE_DETAILS: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
      INVESTIGATION_IN_PROGRESS: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
      DRAFT_REVIEW: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
      CLOSED_WITH_MHD: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
      CLOSED_WITH_HR_SPOC: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
      PENDING_L1_REVIEW: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
      PENDING_L2_REVIEW: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
      CLOSED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    }[s] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200/60"
  );
}

export function reviewStatusColor(s: string) {
  return (
    {
      REVIEW_NOT_STARTED: "bg-gray-100 text-gray-600",
      REVIEW_IN_PROGRESS: "bg-violet-50 text-violet-700",
      CORRECTIONS_REQUIRED: "bg-rose-50 text-rose-700",
      CORRECTIONS_COMPLETED: "bg-amber-50 text-amber-700",
      COMPLETED: "bg-emerald-50 text-emerald-700",
    }[s] ?? "bg-gray-50 text-gray-600"
  );
}
