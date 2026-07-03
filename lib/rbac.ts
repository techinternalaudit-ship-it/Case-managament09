import type { User } from "@prisma/client";

export type Role = "ADMIN" | "INVESTIGATOR" | "REVIEWER_L1" | "REVIEWER_L2";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string; // primary role (backward compat)
  roles: string; // comma-separated: "ADMIN,REVIEWER_L1"
  scopeEntity?: string | null;
  scopeDept?: string | null;
};
// Compat: User pick used to be the source; keep both shapes assignable.
export type SessionUserFromDb = Pick<User, "id" | "email" | "name" | "role" | "roles" | "scopeEntity" | "scopeDept">;

export type Action =
  | "case:create"
  | "case:edit-any"
  | "case:edit-assigned"
  | "case:view"
  | "case:approve"
  | "case:import"
  | "case:export"
  | "case:assign"
  | "case:submit-for-review"
  | "case:review-l1"
  | "case:review-l2"
  | "user:manage"
  | "lookup:manage"
  | "audit:view-any";

const MATRIX: Record<Action, Role[]> = {
  "case:create": ["ADMIN", "INVESTIGATOR"],
  "case:edit-any": ["ADMIN"],
  "case:edit-assigned": ["ADMIN", "INVESTIGATOR"],
  "case:view": ["ADMIN", "INVESTIGATOR", "REVIEWER_L1", "REVIEWER_L2"],
  "case:approve": ["ADMIN", "REVIEWER_L1", "REVIEWER_L2"],
  "case:import": ["ADMIN"],
  "case:export": ["ADMIN", "INVESTIGATOR", "REVIEWER_L1", "REVIEWER_L2"],
  "case:assign": ["ADMIN"],
  "case:submit-for-review": ["ADMIN", "INVESTIGATOR"],
  "case:review-l1": ["ADMIN", "REVIEWER_L1"],
  "case:review-l2": ["ADMIN", "REVIEWER_L2"],
  "user:manage": ["ADMIN"],
  "lookup:manage": ["ADMIN"],
  "audit:view-any": ["ADMIN", "REVIEWER_L1", "REVIEWER_L2"],
};

export function can(user: SessionUser | null | undefined, action: Action): boolean {
  if (!user) return false;
  const userRoles = (user.roles || user.role || "").split(",").map(r => r.trim()).filter(Boolean);
  return MATRIX[action]?.some(r => userRoles.includes(r)) ?? false;
}

/** Returns Prisma `where` filter scoped to cases the user is allowed to see in their personal Cases view. */
export function caseVisibilityFilter(user: SessionUser) {
  const userRoles = (user.roles || user.role || "").split(",").map(r => r.trim()).filter(Boolean);
  if (userRoles.includes("ADMIN")) return { assigneeId: user.id };
  if (userRoles.includes("REVIEWER_L1") || userRoles.includes("REVIEWER_L2")) return {};
  if (userRoles.includes("INVESTIGATOR")) return { assigneeId: user.id };
  return { assigneeId: user.id };
}

/** Returns an empty filter — shows all cases. Used in admin-only views. */
export function allCasesFilter() {
  return {};
}
