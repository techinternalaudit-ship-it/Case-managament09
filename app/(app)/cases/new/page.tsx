import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { createCase } from "../actions";
import { CaseIntakeForm } from "./form";

export default async function NewCasePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!can(session.user, "case:create")) {
    return <div className="card p-6">You don&apos;t have permission to create cases.</div>;
  }

  const [categories, investigators, max] = await Promise.all([
    db.lookupCategory.findMany({ include: { subs: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: { in: ["INVESTIGATOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } }),
    db.case.aggregate({ _max: { caseNo: true } }),
  ]);
  const nextCaseNo = (max._max.caseNo ?? 0) + 1 || 100001;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title">New Case</h1>
        <p className="page-sub">Complete the intake. Investigation lifecycle fields can be filled later from the case detail page.</p>
      </div>
      <CaseIntakeForm
        action={createCase}
        nextCaseNo={nextCaseNo}
        categories={categories.map((c) => ({ id: c.id, name: c.name, subs: c.subs.map((s) => ({ id: s.id, name: s.name })) }))}
        investigators={investigators.map((u) => ({ id: u.id, name: u.name }))}
      />
    </div>
  );
}
