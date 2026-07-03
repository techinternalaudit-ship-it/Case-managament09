export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AnalyticsBuilder } from "./builder";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!can(session.user, "case:view")) redirect("/cases");

  const cases = await db.case.findMany({
    include: {
      assignee: { select: { name: true } },
      category: { select: { name: true } },
      subCategory: { select: { name: true } },
    },
  });

  const data = cases.map((c) => ({
    severity: c.severity,
    status: c.investigationStatus,
    channel: c.escalationChannel,
    entity: c.respondentEntity,
    month: c.month,
    saleNonSale: c.saleNonSale ?? "\u2014",
    complainantType: c.complainantType ?? "\u2014",
    tatBreach: c.tatBreach ? "Yes" : "No",
    substantiated:
      c.substantiated == null ? "\u2014" : c.substantiated ? "Yes" : "No",
    city: c.city ?? "\u2014",
    state: c.state ?? "\u2014",
    department: c.respondentDept ?? "\u2014",
    investigator: c.assignee?.name ?? "Unassigned",
    category: c.category.name,
    subCategory: c.subCategory.name,
    tatDays: c.tatDays ?? 0,
    caseAge: c.caseAge ?? 0,
    complaintDate: c.complaintDate.toISOString().slice(0, 10),
    closureDate: c.closureDate
      ? c.closureDate.toISOString().slice(0, 10)
      : null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Custom Analytics</h1>
        <p className="page-sub">
          Build custom charts and pivot views from case data.
        </p>
      </div>
      <AnalyticsBuilder data={data} />
    </div>
  );
}
