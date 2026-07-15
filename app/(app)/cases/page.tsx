export const dynamic = "force-dynamic";

import Link from "next/link";
import { listVisibleCases } from "./actions";
import { severityColor, statusColor, STATUS_LABELS, SEVERITY_LABELS } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { getScope } from "@/lib/scope";

/* ── Sortable column header ──────────────────────────────────────────── */

function SortHeader({
  label,
  field,
  currentSort,
  params,
}: {
  label: string;
  field: string;
  currentSort?: string;
  params: URLSearchParams;
}) {
  const [curField, curDir] = (currentSort ?? "").split(":");
  const active = curField === field;
  const nextDir = active && curDir === "asc" ? "desc" : "asc";

  const sp = new URLSearchParams(params);
  sp.set("sort", `${field}:${nextDir}`);
  sp.delete("page"); // reset to page 1 on sort change

  return (
    <th className="px-4 py-3 text-left font-semibold">
      <Link
        href={`/cases?${sp.toString()}`}
        className="inline-flex items-center gap-1 hover:text-ink-900 dark:hover:text-white transition-colors"
      >
        {label}
        <span className="text-[10px] leading-none">
          {active ? (curDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </Link>
    </th>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sev?: string; status?: string; breach?: string; page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const scope = await getScope();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { cases, total, page, totalPages } = await listVisibleCases(scope, {
    page: pageNum,
    q: sp.q,
    sev: sp.sev,
    status: sp.status,
    breach: sp.breach,
    sort: sp.sort,
  });

  const title = scope === "all" ? "All Cases" : "My Cases";

  // Build URLSearchParams preserving current filters for pagination/sort links
  const baseParams = new URLSearchParams();
  if (sp.q) baseParams.set("q", sp.q);
  if (sp.sev) baseParams.set("sev", sp.sev);
  if (sp.status) baseParams.set("status", sp.status);
  if (sp.breach) baseParams.set("breach", sp.breach);
  if (sp.sort) baseParams.set("sort", sp.sort);

  function pageHref(p: number) {
    const ps = new URLSearchParams(baseParams);
    if (p > 1) ps.set("page", String(p));
    else ps.delete("page");
    const qs = ps.toString();
    return `/cases${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">
            Showing <span className="font-semibold text-ink-800 dark:text-white">{cases.length}</span> of {total} cases{scope === "all" ? " across the organization" : " assigned to you"}.
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
          <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Case number, respondent, subject…" />
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
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          <button className="btn-secondary text-xs">Apply</button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <SortHeader label="Case No." field="caseNo" currentSort={sp.sort} params={baseParams} />
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold">Respondent</th>
                <SortHeader label="Complaint Date" field="complaintDate" currentSort={sp.sort} params={baseParams} />
                <SortHeader label="Severity" field="severity" currentSort={sp.sort} params={baseParams} />
                <SortHeader label="Status" field="investigationStatus" currentSort={sp.sort} params={baseParams} />
                <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                <th className="px-4 py-3 text-left font-semibold">SLA</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
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
                  <td className="px-4 py-3.5 text-ink-600 dark:text-gray-400 text-xs whitespace-nowrap">
                    {c.complaintDate ? new Date(c.complaintDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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
              {cases.length === 0 && (
                <tr>
                  <td colSpan={8}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-200/60 dark:border-white/[0.06] px-4 py-3">
            <div>
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-secondary text-xs">
                  &larr; Previous
                </Link>
              ) : (
                <span className="btn-secondary text-xs opacity-40 pointer-events-none">
                  &larr; Previous
                </span>
              )}
            </div>
            <span className="text-xs text-ink-500 dark:text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="btn-secondary text-xs">
                  Next &rarr;
                </Link>
              ) : (
                <span className="btn-secondary text-xs opacity-40 pointer-events-none">
                  Next &rarr;
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
