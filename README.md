# Vigilance Case Manager

Web app replacing the legacy 47-column Excel tracker. Prototype-ready, Paytm-deploy-ready.

## Quick start

```bash
npm install
npm run db:reset      # creates SQLite db + seeds lookups + demo users
npm run dev           # http://localhost:3000
```

Sign in with one of the seeded users (see seed output, e.g. `admin@vigilance.local` / `admin123`).

## What's included

- **Auth + RBAC** — Admin, Investigator, Reviewer, HRBP (entity-scoped), HOD (dept-scoped), Viewer.
- **Case management** — 6-step intake form (cols A–AA), tabbed detail page for the investigation lifecycle (AB+), inline edit, attachments, audit log.
- **TAT engine** — auto-computed TAT / case age / breach flag, per-severity SLA (`lib/tat.ts`).
- **Three dashboards** — Overview, Workload (per-investigator load, severity mix, aging heatmap, capacity badge, unassigned widget, categories handled), Compliance/TAT.
- **Bulk Excel import** — `/import` route consumes the legacy tracker; unknown categories/sub-categories are auto-created.
- **Audit log** — every change captured with field-level diff (`lib/audit.ts`).
- **File attachments** — RBAC-enforced download via `/api/attachments/[id]`.

## Layout

```
app/
  (app)/              # authenticated shell
    cases/            # list, new (stepper), [id] (tabs)
    dashboard/        # overview, workload, compliance
    admin/            # users, lookups, audit
    import/           # bulk Excel import
  sign-in/
  api/
    auth/[...nextauth]/
    attachments/[id]/
lib/
  auth.ts             # Auth.js (credentials)
  rbac.ts             # `can()` + visibility filter
  db.ts               # Prisma client
  tat.ts              # SLA/TAT computation (single source of truth)
  audit.ts            # diff + persist
  utils.ts            # formatting / colors
prisma/
  schema.prisma
  seed.ts             # lookups + demo users
scripts/
  tat-scan.ts         # nightly: recompute breaches
```

## Cron / scheduled jobs

```bash
npm run cron:tat   # recomputes age & breach flag on all open cases
```

Wire into cron / scheduler when deploying.

## Paytm deployment notes

- **DB**: change `DATABASE_URL` in `.env` to Postgres and update `provider` in `prisma/schema.prisma` to `postgresql`.
- **SSO**: replace the `Credentials` provider in `lib/auth.ts` with a SAML / OIDC provider that talks to Paytm IdP.
- **File storage**: the upload path is `STORAGE_DIR`. Swap to an S3-compatible adapter (the API surface is local to `lib/...` and `app/api/attachments/[id]/route.ts`).
- **Email** (TAT reminders): not wired in this prototype — `scripts/tat-scan.ts` flips the breach flag; add a mailer call there before promoting.

## Smoke test

1. `npm run db:reset && npm run dev`
2. Sign in as `admin@vigilance.local` / `admin123`.
3. `/import` → upload `Dummy Tracker.xlsx` → see 1 case imported.
4. `/cases` → click the case → edit Investigation Status → save → audit tab shows the diff.
5. `/dashboard/workload` → see Raina's load.
6. `npm run cron:tat` → re-runs TAT computation.

