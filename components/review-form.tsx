"use client";

import { useRef } from "react";
import { Icon } from "@/components/icon";

export function ReviewForm({
  caseId,
  level,
  action,
}: {
  caseId: string;
  level: "L1" | "L2";
  action: (formData: FormData) => Promise<void>;
}) {
  const commentsRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (status: "APPROVED" | "REJECTED") => {
    const fd = new FormData();
    fd.set("id", caseId);
    fd.set("level", level);
    fd.set("status", status);
    fd.set("comments", commentsRef.current?.value ?? "");
    action(fd);
  };

  const bgClass = level === "L1"
    ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
    : "bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/30";

  return (
    <div className={`mt-3 space-y-3 p-4 rounded-xl border ${bgClass}`}>
      <div className="text-sm font-semibold text-ink-800 dark:text-white">{level} Review</div>
      <div>
        <label className="label">Comments</label>
        <textarea
          ref={commentsRef}
          className="input"
          rows={2}
          placeholder="Add your review comments..."
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary bg-emerald-600 hover:bg-emerald-700"
          onClick={() => handleSubmit("APPROVED")}
        >
          <Icon name="check" className="h-4 w-4" />{" "}
          {level === "L1" ? "Approve → L2" : "Approve & Close"}
        </button>
        <button
          type="button"
          className="btn-secondary text-rose-600 hover:text-rose-700"
          onClick={() => handleSubmit("REJECTED")}
        >
          <Icon name="arrow-left" className="h-4 w-4" /> Send Back
        </button>
      </div>
    </div>
  );
}
