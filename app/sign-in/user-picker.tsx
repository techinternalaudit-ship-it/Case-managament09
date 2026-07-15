"use client";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { requestPasswordReset } from "./actions";

type PickerUser = { id: string; name: string; role: string };
type ResetState = "idle" | "sending" | "sent" | "already";

const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: "linear-gradient(135deg, #00BAF2 0%, #002970 100%)",
  INVESTIGATOR: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  REVIEWER_L1: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
  REVIEWER_L2: "linear-gradient(135deg, #f97316 0%, #9a3412 100%)",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  INVESTIGATOR: "Investigator",
  REVIEWER_L1: "Reviewer L1",
  REVIEWER_L2: "Reviewer L2",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? parts[parts.length - 1][0] : "").toUpperCase();
}

export function UserPicker({
  users,
  initialError,
  doSignIn,
  googleSignIn,
}: {
  users: PickerUser[];
  initialError: boolean;
  doSignIn: (data: FormData) => Promise<{ error: boolean }>;
  googleSignIn: () => void;
}) {
  const [selected, setSelected] = useState<PickerUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [attempt, setAttempt] = useState(0);
  const [resetState, setResetState] = useState<ResetState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await doSignIn(fd);
      if (result?.error) {
        setError(true);
        setAttempt((n) => n + 1);
      }
      // On success the action performs a server-side redirect and this line
      // is never reached (navigation happens before the promise resolves).
    } finally {
      setLoading(false);
    }
  }

  function selectUser(u: PickerUser) {
    setSelected(u);
    setError(false);
    setLoading(false);
    setResetState("idle");
  }

  async function handleForgotPassword() {
    if (!selected || resetState === "sending" || resetState === "sent") return;
    setResetState("sending");
    try {
      const result = await requestPasswordReset(selected.id);
      if (result?.alreadyPending) {
        setResetState("already");
      } else {
        setResetState("sent");
      }
    } catch {
      setResetState("idle");
    }
  }

  if (!selected) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="grid grid-cols-3 gap-3">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUser(u)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-ink-200/60 bg-white shadow-soft hover:shadow-card hover:-translate-y-[1px] transition-all duration-200 group"
            >
              <div
                className="h-14 w-14 rounded-full grid place-items-center text-white text-lg font-bold shadow-md group-hover:scale-105 transition-transform"
                style={{ background: ROLE_GRADIENT[u.role] ?? "linear-gradient(135deg, #94a3b8 0%, #475569 100%)" }}
              >
                {initials(u.name)}
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-ink-800 truncate max-w-[80px]">{u.name}</div>
                <div className="text-[10px] text-ink-400">{ROLE_LABEL[u.role] ?? u.role}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-ink-200/60" />
          <span className="text-xs text-ink-300 font-medium">or</span>
          <div className="flex-1 h-px bg-ink-200/60" />
        </div>

        <form action={googleSignIn}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl bg-white border border-ink-200/60 shadow-soft hover:shadow-card hover:-translate-y-[1px] transition-all duration-200 group"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-semibold text-ink-700 group-hover:text-ink-900 transition-colors">
              Sign in with Google
            </span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        type="button"
        onClick={() => { setSelected(null); setError(false); setLoading(false); setResetState("idle"); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700 transition-colors"
      >
        <Icon name="arrow-left" className="h-3.5 w-3.5" />
        Not you? Choose another user
      </button>

      <div className="flex items-center gap-3 p-3 rounded-2xl border border-ink-200/60 bg-white shadow-soft">
        <div
          className="h-12 w-12 shrink-0 rounded-full grid place-items-center text-white text-base font-bold shadow-md"
          style={{ background: ROLE_GRADIENT[selected.role] ?? "linear-gradient(135deg, #94a3b8 0%, #475569 100%)" }}
        >
          {initials(selected.name)}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-800">{selected.name}</div>
          <div className="text-xs text-ink-400">{ROLE_LABEL[selected.role] ?? selected.role}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="userId" value={selected.id} />
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600 flex items-start gap-2">
            <Icon name="alert-circle" className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Incorrect password. Please try again.</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-ink-500 tracking-wide uppercase">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetState === "sending" || resetState === "sent" || resetState === "already"}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-default"
            >
              <Icon name="help" className="h-3 w-3" />
              Forgot password?
            </button>
          </div>
          <input
            key={attempt}
            type="password"
            name="password"
            autoFocus
            required
            disabled={loading}
            className="input disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {resetState === "sending" && (
            <p className="mt-2 text-xs text-ink-400 flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Sending request…
            </p>
          )}
          {(resetState === "sent" || resetState === "already") && (
            <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 flex items-start gap-1.5">
              <Icon name="check" className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {resetState === "already"
                  ? "A reset request is already pending. Your admin has been notified."
                  : "Request sent! Your admin will reset your password shortly."}
              </span>
            </div>
          )}
        </div>

        <button
          className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{ background: "linear-gradient(135deg, #00BAF2 0%, #0080aa 100%)" }}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Sign in
              <Icon name="arrow-right" className="h-4 w-4" />
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
