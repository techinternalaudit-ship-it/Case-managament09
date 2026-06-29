import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { UserPicker } from "./user-picker";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/utils";

async function doSignIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    redirect("/sign-in?error=1");
  }
  redirect("/cases");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  const dbUsers = await db.user.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { name: true, email: true, role: true },
  });

  const users = dbUsers.map((u) => ({
    name: u.name,
    email: u.email,
    role: ROLE_LABELS[u.role] ?? u.role,
    initials: u.name
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  }));

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 relative bg-gradient-to-br from-[#002970] via-[#003b75] to-[#0080aa] flex-col justify-between p-10 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.04] rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#00BAF2]/10 rounded-full blur-[60px] translate-y-1/4 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.03] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/[0.05] rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm grid place-items-center">
              <Icon name="shield" className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/90 font-bold text-lg tracking-tight">Vigilance</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-[2.5rem] font-bold text-white leading-[1.15] tracking-tight">
            Case Management<br />
            <span className="text-[#6dcfff]">System</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-[340px]">
            Track investigations, manage assignments, monitor SLA compliance, and generate reports — all in one place.
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/[0.08] grid place-items-center">
                <Icon name="shield" className="h-4 w-4 text-[#6dcfff]" />
              </div>
              <span className="text-sm text-white/60">End-to-end investigation tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/[0.08] grid place-items-center">
                <Icon name="clock" className="h-4 w-4 text-[#6dcfff]" />
              </div>
              <span className="text-sm text-white/60">Automated SLA & TAT monitoring</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/[0.08] grid place-items-center">
                <Icon name="chart" className="h-4 w-4 text-[#6dcfff]" />
              </div>
              <span className="text-sm text-white/60">Real-time dashboards & reports</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-white/25 font-medium tracking-wide">
            INTERNAL USE ONLY · PAYTM VIGILANCE
          </p>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#fafbfd] relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,186,242,0.04)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,41,112,0.03)_0%,_transparent_60%)]" />
        {/* Paytm logo top-right */}
        <div className="absolute top-6 right-8 z-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paytm-logo.svg" alt="Paytm" className="h-6" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo — hidden on desktop */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#00BAF2] to-[#002970] text-white grid place-items-center shadow-lg mb-4">
              <Icon name="shield" className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">Vigilance</h1>
            <p className="text-xs text-ink-400 mt-0.5">Case Management System</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-ink-400 mt-1">Select your profile to sign in.</p>
          </div>

          <div className="lg:hidden text-center mb-6">
            <h1 className="text-lg font-bold text-ink-900">Welcome back</h1>
            <p className="text-sm text-ink-400 mt-0.5">Select your profile to sign in.</p>
          </div>

          <UserPicker error={!!sp?.error} doSignIn={doSignIn} users={users} />

          <p className="text-center text-[10px] text-ink-300 mt-8 font-medium tracking-widest uppercase lg:hidden">
            Internal use only · Paytm Vigilance
          </p>
        </div>
      </div>
    </div>
  );
}
