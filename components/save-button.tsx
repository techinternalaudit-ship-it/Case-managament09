"use client";

import { useFormStatus } from "react-dom";

export function SaveButton({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}
