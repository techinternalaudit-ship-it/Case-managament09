"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { useRouter } from "next/navigation";

export function EmployeeUploader() {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ success: boolean; imported?: number; skipped?: number; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setResult({ success: false, error: "Only .xlsx or .xls files are supported." });
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/employees/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, imported: data.imported, skipped: data.skipped });
        router.refresh();
      } else {
        setResult({ success: false, error: data.error || "Upload failed" });
      }
    } catch {
      setResult({ success: false, error: "Network error. Try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-bold text-ink-900 dark:text-white mb-3">Upload Employee Master</h2>
      <p className="text-xs text-ink-500 dark:text-gray-400 mb-4">
        Upload the latest employee master Excel file. This will <strong>replace all existing employee data</strong> with the new file&apos;s contents.
      </p>

      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
          dragOver
            ? "border-primary-400 bg-primary-50/50 dark:bg-primary-900/10"
            : "border-ink-200 dark:border-white/10 hover:border-primary-300 hover:bg-ink-50/50 dark:hover:bg-white/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="h-10 w-10 mx-auto rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 grid place-items-center animate-pulse">
              <Icon name="upload" className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-ink-700 dark:text-gray-300">Importing employees…</p>
            <p className="text-xs text-ink-400">This may take a few seconds for large files.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-10 w-10 mx-auto rounded-xl bg-ink-100 dark:bg-white/[0.06] text-ink-500 dark:text-gray-400 grid place-items-center">
              <Icon name="upload" className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-ink-700 dark:text-gray-300">
              Drop your Excel file here, or <span className="text-primary-600">click to browse</span>
            </p>
            <p className="text-xs text-ink-400 dark:text-gray-500">Supports .xlsx and .xls files</p>
          </div>
        )}
      </div>

      {result && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
          result.success
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30"
            : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30"
        }`}>
          {result.success ? (
            <span>Imported <strong>{result.imported?.toLocaleString()}</strong> employees successfully.{result.skipped ? ` ${result.skipped} rows skipped (missing E-code).` : ""}</span>
          ) : (
            <span>{result.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
