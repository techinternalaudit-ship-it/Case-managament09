import { Icon } from "@/components/icon";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Case Intake",
    description: "A new case is registered when a complaint comes in — via email, whistleblower portal, helpline, or walk-in. The admin logs it with all details: complainant, respondent, severity, category, and assigns it to an investigator.",
    link: "/cases/new",
    linkLabel: "Create a new case",
    icon: "plus" as const,
    color: "bg-sky-100 text-sky-600",
  },
  {
    number: "02",
    title: "Investigation",
    description: "The assigned investigator works on the case — conducts fieldwork, gathers evidence, uploads attachments, and updates the investigation status. All changes are tracked in the audit log automatically.",
    link: "/cases",
    linkLabel: "View all cases",
    icon: "search" as const,
    color: "bg-violet-100 text-violet-600",
  },
  {
    number: "03",
    title: "Submit for Review",
    description: "Once fieldwork is done, the investigator submits the case for L1 review. The submission timestamp is recorded for performance tracking.",
    icon: "arrow-right" as const,
    color: "bg-amber-100 text-amber-600",
  },
  {
    number: "04",
    title: "L1 Review",
    description: "The L1 Reviewer checks the investigation findings, adds comments, and either approves (sends to L2) or sends back to the investigator for more work. Pending cases appear in the Pending Reviews page.",
    link: "/reviews",
    linkLabel: "View pending reviews",
    icon: "check" as const,
    color: "bg-amber-100 text-amber-700",
  },
  {
    number: "05",
    title: "L2 Review & Closure",
    description: "The L2 Reviewer does the final review. On approval, the case is automatically closed with a closure date, and TAT is computed. If rejected, it goes back to the investigator.",
    icon: "shield" as const,
    color: "bg-orange-100 text-orange-600",
  },
  {
    number: "06",
    title: "Recommendations & Actions",
    description: "For substantiated cases, employee and process recommendations are recorded. The system tracks whether recommendations were approved by the Disciplinary Committee and whether actions were implemented.",
    icon: "edit" as const,
    color: "bg-emerald-100 text-emerald-600",
  },
];

const features = [
  {
    title: "Dashboard",
    description: "Organization-wide health at a glance — total cases, open, in progress, SLA breaches, average TAT, and substantiation rate.",
    href: "/dashboard/overview",
    icon: "home" as const,
  },
  {
    title: "Cases",
    description: "Full list of all cases with search, filters (severity, status, SLA breach), and click-through to case details.",
    href: "/cases",
    icon: "list" as const,
  },
  {
    title: "Pending Reviews",
    description: "Separate queues for L1 and L2 reviewers showing cases awaiting their action, with wait-time indicators.",
    href: "/reviews",
    icon: "check" as const,
  },
  {
    title: "Team Workload",
    description: "Two tables showing each investigator's case load — total, in progress, sent for review, closed, TAT breached — plus severity breakdown.",
    href: "/dashboard/workload",
    icon: "users" as const,
  },
  {
    title: "Compliance & SLA",
    description: "SLA tracking with TAT distribution, breach trends, and approval cycle times. Cases breaching the 40-day TAT limit are flagged automatically.",
    href: "/dashboard/compliance",
    icon: "clock" as const,
  },
  {
    title: "Custom Analytics",
    description: "Build your own charts — pick any field as X-axis, choose a metric (count, avg TAT, avg age), add grouping, and switch between bar, stacked, pie, or line charts.",
    href: "/dashboard/analytics",
    icon: "chart" as const,
  },
  {
    title: "Bulk Import",
    description: "Upload the existing Excel tracker (.xlsx) to seed cases into the system. Columns are auto-mapped by header name. Duplicate case numbers get new numbers automatically.",
    href: "/import",
    icon: "upload" as const,
  },
  {
    title: "Audit Log",
    description: "Every change is logged — who edited what, when, and the before/after values. Available per-case and organization-wide.",
    href: "/admin/audit",
    icon: "history" as const,
  },
];

const roles = [
  {
    role: "Admin",
    capabilities: ["Create & edit any case", "Assign investigators", "Manage users & roles", "Import data", "Access all reports", "Review cases (if also a reviewer)"],
  },
  {
    role: "Investigator",
    capabilities: ["View & edit assigned cases", "Upload attachments", "Submit cases for L1 review", "View own audit log"],
  },
  {
    role: "Reviewer (L1)",
    capabilities: ["View all cases", "Approve or reject cases at L1 stage", "Add review comments", "View pending review queue"],
  },
  {
    role: "Reviewer (L2)",
    capabilities: ["View all cases", "Final approval or rejection", "Close cases on approval", "View pending review queue"],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="page-title">How it Works</h1>
        <p className="page-sub">A quick guide to the Vigilance Case Management System — from intake to closure.</p>
      </div>

      {/* Case Lifecycle */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-6">Case Lifecycle</h2>
        <div className="space-y-1">
          {steps.map((s, i) => (
            <div key={s.number} className="relative flex gap-4">
              {/* Vertical line */}
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-xl ${s.color} grid place-items-center shrink-0 z-10`}>
                  <Icon name={s.icon} className="h-4.5 w-4.5" />
                </div>
                {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-ink-200/60 dark:bg-white/10 my-1" />}
              </div>
              {/* Content */}
              <div className="pb-8">
                <div className="text-[10px] font-bold text-ink-400 dark:text-gray-500 uppercase tracking-widest">Step {s.number}</div>
                <h3 className="text-sm font-bold text-ink-900 dark:text-white mt-0.5">{s.title}</h3>
                <p className="text-sm text-ink-600 dark:text-gray-400 mt-1 leading-relaxed">{s.description}</p>
                {s.link && (
                  <Link href={s.link} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-500 mt-2 transition-colors">
                    {s.linkLabel} <Icon name="arrow-right" className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 grid place-items-center shrink-0">
                  <Icon name={f.icon} className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-900 dark:text-white group-hover:text-primary-600 transition-colors">{f.title}</h3>
                  <p className="text-xs text-ink-500 dark:text-gray-400 mt-0.5 leading-relaxed">{f.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section>
        <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-4">User Roles</h2>
        <p className="text-sm text-ink-500 dark:text-gray-400 mb-4">Each user can have one or more roles. Roles control what you can see and do.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((r) => (
            <div key={r.role} className="card p-4">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white mb-2">{r.role}</h3>
              <ul className="space-y-1.5">
                {r.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs text-ink-600 dark:text-gray-400">
                    <Icon name="check" className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SLA */}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900 dark:text-white mb-3">SLA & TAT Rules</h2>
        <div className="space-y-2 text-sm text-ink-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <Icon name="clock" className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span><strong className="text-ink-800 dark:text-gray-200">TAT limit:</strong> 40 days from complaint date. Cases exceeding this are flagged as SLA breached.</span>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="trend" className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
            <span><strong className="text-ink-800 dark:text-gray-200">Case Age:</strong> Number of days since the complaint was filed (until closure or today).</span>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="alert-circle" className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span><strong className="text-ink-800 dark:text-gray-200">Breach Reason:</strong> When TAT is breached, investigators must document why in the case details.</span>
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section className="card p-5 bg-primary-50/50 dark:bg-primary-900/10 border-primary-200/50 dark:border-primary-800/30">
        <h2 className="text-sm font-bold text-ink-900 dark:text-white mb-2">Quick Start</h2>
        <ol className="space-y-2 text-sm text-ink-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold grid place-items-center shrink-0">1</span>
            <span>Go to <Link href="/cases/new" className="font-semibold text-primary-600 hover:text-primary-500">New Case</Link> and fill in the intake form.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold grid place-items-center shrink-0">2</span>
            <span>Update investigation status and findings as the case progresses.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold grid place-items-center shrink-0">3</span>
            <span>Submit for review when fieldwork is done — L1 → L2 → Closed.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold grid place-items-center shrink-0">4</span>
            <span>Track team performance on <Link href="/dashboard/workload" className="font-semibold text-primary-600 hover:text-primary-500">Team Workload</Link> and SLA compliance on <Link href="/dashboard/compliance" className="font-semibold text-primary-600 hover:text-primary-500">Compliance & SLA</Link>.</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
