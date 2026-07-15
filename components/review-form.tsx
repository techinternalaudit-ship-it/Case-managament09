"use client";

import { useState } from "react";

const REVIEW_STATUSES = [
  { value: "REVIEW_NOT_STARTED", label: "Review not started yet" },
  { value: "REVIEW_IN_PROGRESS", label: "Review in Progress" },
  { value: "CORRECTIONS_REQUIRED", label: "Draft Review - Corrections Required" },
  { value: "CORRECTIONS_COMPLETED", label: "Draft Review - Corrections Completed" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export function ReviewForm({
  caseId,
  level,
  action,
  reviewers,
  currentReviewStatus,
}: {
  caseId: string;
  level: "L1" | "L2";
  action: (formData: FormData) => Promise<void>;
  reviewers?: { id: string; name: string }[];
  currentReviewStatus?: string;
}) {
  const [reviewStatus, setReviewStatus] = useState(
    currentReviewStatus || "REVIEW_NOT_STARTED"
  );
  const [nextReviewerId, setNextReviewerId] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showReviewerPicker =
    level === "L1" && reviewStatus === "COMPLETED" && reviewers && reviewers.length > 0;

  const handleSubmit = async () => {
    setError("");

    if (showReviewerPicker && !nextReviewerId) {
      setError("Please select an L2 reviewer before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("id", caseId);
      fd.set("level", level);
      fd.set("reviewStatus", reviewStatus);
      fd.set("comments", comments);
      if (showReviewerPicker && nextReviewerId) {
        fd.set("nextReviewerId", nextReviewerId);
      }
      await action(fd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const bgClass =
    level === "L1"
      ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
      : "bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/30";

  return (
    <div className={`mt-3 space-y-3 p-4 rounded-xl border ${bgClass}`}>
      <div className="text-sm font-semibold text-ink-800 dark:text-white">
        {level} Review
      </div>

      <div>
        <label className="label">Review Status</label>
        <select
          className="input"
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
        >
          {REVIEW_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Comments</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Add your review comments..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      {showReviewerPicker && (
        <div>
          <label className="label">Select L2 Reviewer</label>
          <select
            className="input"
            value={nextReviewerId}
            onChange={(e) => setNextReviewerId(e.target.value)}
          >
            <option value="">-- Select a reviewer --</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Review"
          )}
        </button>
      </div>
    </div>
  );
}
