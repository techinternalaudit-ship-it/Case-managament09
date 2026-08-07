"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";

export type UploadState = { error?: string } | null;

/**
 * Upload control for case attachments.
 *
 * The action returns its validation failures instead of throwing: a throw
 * inside a server action escapes to the error boundary and blanks the page,
 * and Next redacts the message in production, so "File too large" would never
 * reach the user.
 */
export function AttachmentUploadForm({
  caseId,
  uploadAttachment,
}: {
  caseId: string;
  uploadAttachment: (prev: UploadState, formData: FormData) => Promise<UploadState>;
}) {
  const [state, formAction, pending] = useActionState(uploadAttachment, null);

  return (
    <form action={formAction} className="mb-4">
      {state?.error && (
        <div className="mb-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <Icon name="alert-circle" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input type="hidden" name="caseId" value={caseId} />
        <div className="flex-1">
          <label className="label">Upload file</label>
          <input className="input" type="file" name="file" required disabled={pending} />
        </div>
        <button className="btn-secondary" type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
