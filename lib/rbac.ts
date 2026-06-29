import type { User } from "@prisma/client";

export type Role = "ADMIN" | "INVESTIGATOR" | "REVIEWER" | "HRBP" | "HOD" | "VIEWER";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  scopeEntity?: string | null;
  scopeDept?: string | null;
};
// Compat: User pick used to be the source; keep both shapes assignable.
export type SessionUserFromDb = Pick<User, "id" | "email" | "name" | "role" | "scopeEntity" | "scopeDept">;

export type Action =
  | "case:create"
  | "case:edit-any"
  | "case:edit-assigned"
  | "case:view"
  | "case:approve"
  | "case:import"
  | "case:export"
  | "case:assign"
  | "user:manage"
  | "lookup:manage"
  | "audit:view-any";

const MATRIX: Record<Action, Role[]> = {
  "case:create": ["ADMIN", "INVESTIGATOR"],
  "case:edit-any": ["ADMIN"],
  "case:edit-assigned": ["ADMIN", "INVESTIGATOR"],
  "case:view": ["ADMIN", "INVESTIGATOR", "REVIEWER", "HRBP", "HOD", "VIEWER"],
  "case:approve": ["ADMIN", "REVIEWER"],
  "case:import": ["ADMIN"],
  "case:export": ["ADMIN", "INVESTIGATOR", "REVIEWER"],
  "case:assign": ["ADMIN"],
  "user:manage": ["ADMIN"],
  "lookup:manage": ["ADMIN"],
  "audit:view-any": ["ADMIN", "REVIEWER"],
};

export function can(user: SessionUser | null | undefined, action: Action): boolean {
  if (!user) return false;
  return MATRIX[action]?.includes(user.role as Role) ?? false;
}

/** Returns Prisma `where` filter scoped to cases the user is allowed to see in their personal Cases view. */
export function caseVisibilityFilter(user: SessionUser) {
  const role = user.role as Role;
  if (role === "REVIEWER") return {};
  if (role === "ADMIN" || role === "INVESTIGATOR") return { assigneeId: user.id };
  if (role === "HRBP") {
    const conds: object[] = [];
    if (user.scopeEntity) conds.push({ respondentEntity: user.scopeEntity });
    if (user.scopeDept) conds.push({ respondentDept: user.scopeDept });
    return conds.length ? { OR: conds } : {};
  }
  if (role === "HOD") {
    return user.scopeDept ? { respondentDept: user.scopeDept } : {};
  }
  return { assigneeId: user.id };
}

/** Returns an empty filter — shows all cases. Used in admin-only views. */
export function allCasesFilter() {
  return {};
}
