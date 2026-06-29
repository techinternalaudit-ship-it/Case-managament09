export const dynamic = "force-dynamic";

import Link from "next/link";
import { listVisibleCases } from "./actions";
import { severityColor, statusColor, STATUS_LABELS, SEVERITY_LABELS } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { getScope } from "@/lib/scope";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sev?: string; status?: string; breach?: string }>;
}) {
  const sp = await searchParams;
  const scope = await getScope();
  const all = await listVisibleCases(scope);
  const filtered = all.filter((c) => {
    if (sp.q) {
      const q = sp.q.toLowerCase();
      const hay = `${c.caseNo} ${c.respondentName} ${c.subjectLine} ${c.respondentECode ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (sp.sev && c.severity !== sp.sev) return false;
    if (sp.status && c.investigationStatus !== sp.status) return false;
    if (sp.breach === "1" && !c.tatBreach) return false;
    return true;
  });

  const title = scope === "all" ? "All Cases" : "My Cases";
  const subtitle = scope === "all"
    ? `Showing ${filtered.length} of ${all.length} cases across the organization.`
    : `Showing ${filtered.length} of ${all.length} cases assigned to you.`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">
            Showing <span className="font-semibold text-ink-800 dark:text-white">{filtered.length}</span> of {all.length} cases{scope === "all" ? " across the organization" : " assigned to you"}.
          </p>
        </div>
        <Link href="/cases/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" /> New Case
        </Link>
      </div>

      {/* Filters */}
      <form className="card p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <label className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 dark:text-gray-500" />
            <input className="input pl-10" name="q" defaultValue={sp.q ?? ""} placeholder="Case number, respondent, subject…" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Severity</label>
          <select className="input" name="sev" defaultValue={sp.sev ?? ""}>
            <option value="">All</option>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Status</label>
          <select className="input" name="status" defaultValue={sp.status ?? ""}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="md:col-span-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-ink-600 dark:text-gray-400">
            <input type="checkbox" name="breach" value="1" defaultChecked={sp.breach === "1"} className="h-4 w-4 rounded border-ink-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            SLA breach
          </label>
          <button className="btn-secondary text-xs">Apply</button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Case No.</th>
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold">Respondent</th>
                <th className="px-4 py-3 text-left font-semibold">Severity</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                <th className="px-4 py-3 text-left font-semibold">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3.5">
                    <Link className="font-semibold text-primary-700 dark:text-primary-400 hover:text-primary-500 transition-colors text-sm" href={`/cases/${c.id}`}>#{c.caseNo}</Link>
                  </td>
                  <td className="px-4 py-3.5 max-w-sm">
                    <div className="truncate text-ink-900 dark:text-gray-200 font-medium text-sm">{c.subjectLine}</div>
                    <div className="text-[11px] text-ink-400 dark:text-gray-500">{c.category.name}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-ink-900 dark:text-gray-200 text-sm">{c.respondentName}</div>
                    <div className="text-[11px] text-ink-400 dark:text-gray-500">{c.respondentEntity}</div>
                  </td>
                  <td className="px-4 py-3.5"><span className={`badge ${severityColor(c.severity)}`}>{SEVERITY_LABELS[c.severity] ?? c.severity}</span></td>
                  <td className="px-4 py-3.5"><span className={`badge ${statusColor(c.investigationStatus)}`}>{STATUS_LABELS[c.investigationStatus] ?? c.investigationStatus}</span></td>
                  <td className="px-4 py-3.5">
                    {c.assignee?.name ? (
                      <span className="text-ink-800 dark:text-gray-300 text-sm">{c.assignee.name}</span>
                    ) : (
                      <span className="text-ink-400 dark:text-gray-600 text-xs italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {c.tatBreach ? (
                      <span className="badge bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200/60 dark:ring-rose-800/30">
                        <Icon name="alert-circle" className="h-3 w-3" /> Breached
                      </span>
                    ) : (
                      <span className="badge bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200/60 dark:ring-emerald-800/30">
                        <Icon name="check" className="h-3 w-3" /> OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <div className="h-14 w-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-500 grid place-items-center">
                        <Icon name="search" className="h-6 w-6" />
                      </div>
                      <div className="text-ink-900 dark:text-white font-semibold text-lg">No cases found</div>
                      <div className="max-w-sm text-sm">Try adjusting the filters above, or register a new case.</div>
                      <Link href="/cases/new" className="btn-primary mt-3">
                        <Icon name="plus" className="h-4 w-4" /> New Case
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
