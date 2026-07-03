import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLE_LABELS } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { SidebarLink } from "@/components/sidebar-link";
import { ScopeToggle } from "@/components/scope-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getScope } from "@/lib/scope";
import { getTheme } from "@/lib/theme";

async function doSignOut() {
  "use server";
  await signOut({ redirect: false });
  redirect("/sign-in");
}

type NavItem = { href: string; label: string; icon: React.ComponentProps<typeof Icon>["name"] };
type NavGroup = { group: string; items: NavItem[] };

function buildNav(roles: string): NavGroup[] {
  const roleSet = roles.split(",").map(r => r.trim());
  const isReviewer = roleSet.includes("REVIEWER_L1") || roleSet.includes("REVIEWER_L2") || roleSet.includes("ADMIN");
  const nav: NavGroup[] = [
    {
      group: "Workspace",
      items: [
        { href: "/dashboard/overview", label: "Dashboard", icon: "home" },
        { href: "/cases", label: "Cases", icon: "list" },
        { href: "/cases/new", label: "New Case", icon: "plus" },
        ...(isReviewer ? [{ href: "/reviews" as const, label: "Pending Reviews", icon: "check" as const }] : []),
        { href: "/how-it-works", label: "How it Works", icon: "help" as const },
        { href: "/admin/employees", label: "Employee Master", icon: "briefcase" },
      ],
    },
    {
      group: "Reports",
      items: [
        { href: "/dashboard/workload", label: "Team Workload", icon: "users" },
        { href: "/dashboard/compliance", label: "Compliance & SLA", icon: "clock" },
        { href: "/dashboard/analytics", label: "Custom Analytics", icon: "chart" },
      ],
    },
  ];

  if (roleSet.includes("ADMIN")) {
    nav.push({
      group: "Administration",
      items: [
        { href: "/import", label: "Import Data", icon: "upload" },
        { href: "/admin/users", label: "Users", icon: "user" },
        { href: "/admin/lookups", label: "Categories", icon: "tags" },
        { href: "/admin/audit", label: "Audit Log", icon: "history" },
      ],
    });
  } else if (roleSet.includes("REVIEWER_L1") || roleSet.includes("REVIEWER_L2")) {
    nav.push({
      group: "Administration",
      items: [
        { href: "/admin/audit", label: "Audit Log", icon: "history" },
      ],
    });
  }

  return nav;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const u = session.user;
  const initials = u.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const nav = buildNav(u.roles || u.role);
  const scope = await getScope();
  const theme = await getTheme();

  return (
    <div className="min-h-screen flex bg-canvas dark:bg-[#0b0f1a]">
      {/* Sidebar */}
      <aside className="w-[var(--sidebar-w)] shrink-0 bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl border-r border-ink-200/50 dark:border-white/[0.06] flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ink-100/60 dark:border-white/[0.04]">
          <Link href="/dashboard/overview" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white grid place-items-center shadow-md group-hover:shadow-glow transition-shadow duration-300 overflow-hidden">
              <Icon name="shield" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-ink-900 dark:text-white leading-tight tracking-tight">Vigilance</div>
              <div className="text-[11px] text-ink-400 dark:text-gray-500 font-medium tracking-wide">CASE MANAGEMENT</div>
            </div>
          </Link>
        </div>

        {/* Scope toggle */}
        <div className="px-4 pt-4 pb-1">
          <ScopeToggle scope={scope} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
          {nav.map((g) => (
            <div key={g.group}>
              <div className="px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400 dark:text-gray-600 mb-1.5">{g.group}</div>
              <ul className="space-y-0.5">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <SidebarLink href={i.href} icon={i.icon} label={i.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="border-t border-ink-100/60 dark:border-white/[0.04] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white grid place-items-center font-bold text-xs shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900 dark:text-white truncate">{u.name}</div>
              <div className="text-[11px] text-ink-400 dark:text-gray-500 font-medium truncate">{(u.roles || u.role || "").split(",").map(r => ROLE_LABELS[r.trim()] ?? r.trim()).filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <form action={doSignOut}>
            <button className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-ink-500 dark:text-gray-500 hover:text-ink-800 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/[0.06] py-2 rounded-xl transition-all duration-200">
              <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-auto flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-canvas/80 dark:bg-[#0b0f1a]/80 backdrop-blur-lg border-b border-ink-100/60 dark:border-white/[0.04]">
          <div className="px-8 py-3 mx-auto w-full max-w-[1240px] flex items-center justify-end gap-4">
            <ThemeToggle theme={theme} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/paytm-logo.svg" alt="Paytm" className="h-5 dark:brightness-0 dark:invert" />
          </div>
        </div>
        <div className="px-8 py-7 mx-auto w-full max-w-[1240px] animate-page">
          {children}
        </div>
      </main>
    </div>
  );
}
