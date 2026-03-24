# HR System — web app

Next.js dashboard for multi-store HR operations: time clock, people, timesheets, reports, audit log, and settings. Uses Supabase for auth and data when `DATA_MODE=api`.

## Quick start

```bash
cd web-app
npm install
cp .env.example .env.local
# Edit .env.local — see docs/dev.md for DATA_MODE and auth behavior
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (default port; use the URL shown in the terminal).

## Documentation

- **[docs/PRD.md](./docs/PRD.md)** — Product requirements (workforce dashboard vision) and **§7 implementation snapshot** vs this repo.
- **[docs/dev.md](./docs/dev.md)** — `DATA_MODE`, `REQUIRE_SUPABASE_AUTH`, `ALLOW_UNAUTHENTICATED_DEV`, production checklist, and how to tell mock vs live data.
- **[docs/phase-c.md](./docs/phase-c.md)** — sign-in, seed SQL (`supabase/seed-dev.sql`), and verifying real API data.
- **[docs/phase-d.md](./docs/phase-d.md)** — Time clock (`/time-clock`), store-scoped roster (`/employees`), APIs, and verification.
- **[docs/phase-e.md](./docs/phase-e.md)** — Timesheets, audit log, settings (Phase E).
- **[docs/phase-f.md](./docs/phase-f.md)** — CSV/pay periods, payroll approval, audit filters, policy edit, create employee (Phase F).
- **[docs/ui-design-review-prompt.md](./docs/ui-design-review-prompt.md)** — reusable prompt for hierarchy/focus/nav reviews; **[docs/ui-design-review-findings.md](./docs/ui-design-review-findings.md)** — latest snapshot.
- **[docs/dynamics-trust-review-prompt.md](./docs/dynamics-trust-review-prompt.md)** — interaction clarity, feedback, trust; **[docs/dynamics-trust-review-findings.md](./docs/dynamics-trust-review-findings.md)** — latest snapshot.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run lint` | ESLint                   |

## Database

SQL migrations live in `supabase/migrations/`. Apply them in the Supabase SQL editor or via the Supabase CLI.

### Name in Supabase vs in the app

The **browser tab**, **login**, and **sidebar** use the product name from this app (**HR System**). The label for your project on [supabase.com](https://supabase.com) is separate: **Project Settings → General** (display / project name). Optional: **Authentication → Email templates** so invite and reset emails match **HR System**.
