"use client";
import { useRef, useState } from "react";
import { Icon } from "@/components/icon";

export function ChangePasswordForm({
  changeOwnPassword,
}: {
  changeOwnPassword: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await changeOwnPassword(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        formRef.current?.reset();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600 flex items-start gap-2">
          <Icon name="alert-circle" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <Icon name="check" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Password changed successfully.</span>
        </div>
      )}

      <div>
        <label className="label">Current Password</label>
        <input
          type="password"
          name="currentPassword"
          required
          disabled={loading}
          className="input disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Enter your current password"
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="label">New Password</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={6}
          disabled={loading}
          className="input disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="label">Confirm New Password</label>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={6}
          disabled={loading}
          className="input disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Re-enter new password"
          autoComplete="new-password"
        />
      </div>

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Updating...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Icon name="check" className="h-4 w-4" /> Update Password
          </span>
        )}
      </button>
    </form>
  );
}
