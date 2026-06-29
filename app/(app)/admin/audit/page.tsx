import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!can(session.user, "audit:view-any")) return <div className="card p-6">Forbidden.</div>;

  const logs = await db.auditLog.findMany({
    take: 200,
    orderBy: { at: "desc" },
    include: { user: { select: { name: true } }, case: { select: { caseNo: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Entity</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Diff</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              let diff: Record<string, { before: unknown; after: unknown }> = {};
              try { diff = JSON.parse(l.diff); } catch {}
              return (
                <tr key={l.id} className="table-row align-top">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(l.at)}</td>
                  <td className="px-3 py-2">{l.user.name}</td>
                  <td className="px-3 py-2">
                    {l.case ? <Link className="text-primary-700 hover:underline" href={`/cases/${l.caseId}`}>Case #{l.case.caseNo}</Link> : `${l.entity}:${l.entityId.slice(0, 6)}`}
                  </td>
                  <td className="px-3 py-2"><span className="badge bg-gray-100 text-gray-700">{l.action}</span></td>
                  <td className="px-3 py-2 text-xs">
                    {Object.entries(diff).map(([k, v]) => (
                      <div key={k}><span className="text-gray-600">{k}:</span> <span className="text-gray-400 line-through">{String(v.before ?? "—")}</span> → <span className="text-gray-900">{String(v.after ?? "—")}</span></div>
                    ))}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">No audit entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
