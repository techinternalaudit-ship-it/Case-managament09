"use client";
import { useState } from "react";
import { Icon } from "@/components/icon";

type PickerUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

const GRADIENTS = [
  "from-[#00BAF2] to-[#0080aa]",
  "from-[#002970] to-[#003b75]",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-600",
  "from-teal-500 to-cyan-700",
  "from-indigo-500 to-blue-700",
];

export function UserPicker({
  error,
  doSignIn,
  users,
}: {
  error: boolean;
  doSignIn: (data: FormData) => void;
  users: PickerUser[];
}) {
  const [selected, setSelected] = useState<PickerUser | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function pick(u: PickerUser) {
    setSelected(u);
    setPassword("");
  }

  function back() {
    setSelected(null);
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("email", selected.email);
    fd.append("password", password);
    doSignIn(fd);
  }

  if (selected) {
    const idx = users.indexOf(selected);
    const grad = GRADIENTS[idx % GRADIENTS.length];
    return (
      <form onSubmit={handleSubmit} className="animate-fade-in">
        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600 flex items-start gap-2">
            <Icon name="alert-circle" className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Incorrect password. Please try again.</span>
          </div>
        )}

        <div className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-ink-200/50 shadow-soft mb-5">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${grad} text-white grid place-items-center font-bold text-sm shrink-0 shadow-sm`}>
            {selected.initials}
          </div>
          <div>
            <div className="font-semibold text-ink-900 text-[15px]">{selected.name}</div>
            <div className="text-xs text-ink-400 font-medium">{selected.role}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5 tracking-wide uppercase">Password</label>
            <input
              type="password"
              autoFocus
              required
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg, #00BAF2 0%, #0080aa 100%)" }}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Signing in…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Sign in
                <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={back}
            className="w-full text-xs font-semibold text-ink-400 hover:text-ink-700 transition py-2 inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="arrow-left" className="h-3 w-3" />
            Back to all users
          </button>
        </div>
      </form>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-ink-400">
        <div className="h-14 w-14 rounded-2xl bg-ink-100 text-ink-400 grid place-items-center mx-auto mb-3">
          <Icon name="users" className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">No active users found.</p>
        <p className="text-xs mt-1">Ask an admin to create your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {users.map((u, i) => (
        <button
          key={u.email}
          type="button"
          onClick={() => pick(u)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-ink-200/50 shadow-soft hover:shadow-card hover:border-primary-300 hover:-translate-y-[2px] transition-all duration-200 group"
        >
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} text-white grid place-items-center font-bold text-sm shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-200`}>
            {u.initials}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="font-semibold text-[15px] text-ink-900 group-hover:text-primary-700 transition-colors truncate">{u.name}</div>
            <div className="text-xs text-ink-400 font-medium">{u.role}</div>
          </div>
          <Icon name="arrow-right" className="h-4 w-4 text-ink-300 group-hover:text-primary-500 transition-colors shrink-0" />
        </button>
      ))}
    </div>
  );
}
