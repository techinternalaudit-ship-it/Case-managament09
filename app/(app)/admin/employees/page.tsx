export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmployeeUploader } from "./uploader";

export default async function EmployeeMasterPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  // Accessible to all logged-in users

  const employeeCount = await db.employee.count();
  const lastUpload = await db.employeeUploadLog.findFirst({ orderBy: { uploadedAt: "desc" } });
  const recentUploads = await db.employeeUploadLog.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 5,
    include: { uploadedBy: { select: { name: true } } },
  });

  // Get a sample of recent employees for preview
  const sampleEmployees = await db.employee.findMany({ take: 10, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Employee Master</h1>
        <p className="page-sub">Upload the employee master Excel to enable auto-populate by E-code on the case intake form.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-[11px] font-bold text-ink-400 dark:text-gray-500 uppercase tracking-wider">Total Employees</div>
          <div className="text-2xl font-bold text-ink-900 dark:text-white mt-1 tabular-nums">{employeeCount.toLocaleString()}</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-bold text-ink-400 dark:text-gray-500 uppercase tracking-wider">Last Upload</div>
          <div className="text-sm font-semibold text-ink-800 dark:text-gray-200 mt-1">
            {lastUpload
              ? new Date(lastUpload.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Never"}
          </div>
          {lastUpload && <div className="text-[11px] text-ink-400 mt-0.5">{lastUpload.filename}</div>}
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-bold text-ink-400 dark:text-gray-500 uppercase tracking-wider">Last Import Rows</div>
          <div className="text-2xl font-bold text-ink-900 dark:text-white mt-1 tabular-nums">{lastUpload?.rowCount.toLocaleString() ?? "—"}</div>
        </div>
      </div>

      {/* Upload */}
      <EmployeeUploader />

      {/* Upload history */}
      {recentUploads.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04]">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Upload History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">File</th>
                <th className="px-4 py-3 text-center font-semibold">Rows Imported</th>
                <th className="px-4 py-3 text-left font-semibold">Uploaded By</th>
                <th className="px-4 py-3 text-right font-semibold">Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              {recentUploads.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="px-5 py-3 font-medium text-ink-800 dark:text-gray-200">{u.filename}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{u.rowCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink-700 dark:text-gray-300 font-medium">{u.uploadedBy.name}</td>
                  <td className="px-4 py-3 text-right text-ink-500 dark:text-gray-400">
                    {new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee preview */}
      {sampleEmployees.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100/60 dark:border-white/[0.04]">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Employee Preview</h2>
            <p className="text-[11px] text-ink-400 dark:text-gray-500 mt-0.5">First 10 records (sorted by name)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-100/50 dark:bg-white/[0.03] text-[11px] text-ink-500 dark:text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">E-code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                </tr>
              </thead>
              <tbody>
                {sampleEmployees.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-ink-800 dark:text-gray-200">{e.eCode}</td>
                    <td className="px-4 py-3 font-medium text-ink-800 dark:text-gray-200">{e.name}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{e.entity || "—"}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{e.grade || "—"}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{e.department || "—"}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-gray-400">{e.city || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
