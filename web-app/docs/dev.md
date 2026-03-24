# Developer guide — data mode & authentication

## Environment variables

| Variable | Values | Effect |
|----------|--------|--------|
| `DATA_MODE` | `mock` (default if unset) | All dashboard API routes use **in-memory mock data**. No Supabase session required. |
| `DATA_MODE` | `api` | Routes use **Supabase** when a user is **signed in** (session cookies). |
| `REQUIRE_SUPABASE_AUTH` | unset / not `true` (default for local dev) | **No login wall:** `/` and dashboard never redirect to `/login`; `/login` redirects to `/overview`. With `DATA_MODE=api` and **no** session, APIs **return mock data** (not `401`). |
| `REQUIRE_SUPABASE_AUTH` | `true` | **Production-style:** dashboard requires a session; `/login` shows the form; with `DATA_MODE=api` and no session, APIs return **`401`** unless `ALLOW_UNAUTHENTICATED_DEV` is on. |
| `ALLOW_UNAUTHENTICATED_DEV` | `true` | **Only when `REQUIRE_SUPABASE_AUTH=true`:** if there is **no** session, API routes still **fall back to mock** (local escape hatch). **Never** enable on a public deployment. |
| `ALLOW_UNAUTHENTICATED_DEV` | unset / `false` | With `REQUIRE_SUPABASE_AUTH=true` and no session → **`401`**. |
| `SHOW_DEV_DATA_BANNER` | unset / `true` | When the dev banner would show (`DATA_MODE=api` and auth not strictly required), the yellow strip appears. |
| `SHOW_DEV_DATA_BANNER` | `false`, `0`, `off`, `no` | **Hides** that banner only — same API/auth behavior; use when the strip is noisy locally. |
| `LABOR_ESTIMATE_BLENDED_RATE` | number (optional) | **Server-only.** USD per weighted hour for chart labor estimates: `(regular + OT×1.5 + DT×2) × rate`. Default **25**. Set in `.env.local` to match a company default until per-employee rates are used in this API. |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required when using Supabase clients (e.g. `DATA_MODE=api`).

## How to tell what you’re seeing

- **Viewing demo data** banner (when shown) → you are on **`DATA_MODE=api`** without a strict auth wall; APIs may return **`getMockKpis()`** / mock stores instead of live SQL.
- With **`REQUIRE_SUPABASE_AUTH` unset** (or not `true`) and **`DATA_MODE=api`**, the dashboard stays open without signing in; responses can be **mock** while the database is **unused**.

## Production checklist

1. Set **`REQUIRE_SUPABASE_AUTH=true`**.
2. Set **`ALLOW_UNAUTHENTICATED_DEV`** to **`false`** or remove it.
3. Prefer **`DATA_MODE=api`** with a real auth flow and seeded `public.users` / RLS-tested roles.
4. Use **`DATA_MODE=mock`** only for demos or CI without secrets.

## Phase C — live Supabase (sign-in + seed)

See **[docs/phase-c.md](./phase-c.md)** for: enabling required login (`REQUIRE_SUPABASE_AUTH`), running **`supabase/seed-dev.sql`**, and verifying KPIs are not mock-only.

## Related files

- `docs/phase-d.md` — Time clock UI (`/time-clock`) and employee roster (`/employees`, `GET /api/employees`).
- `docs/phase-e.md` — Timesheets (`/api/timesheets`), audit log (`/api/audit-log`), settings (`/api/app-environment`, `/api/policy-configs`).
- `docs/phase-f.md` — Pay periods, CSV, payroll approval, audit filters, policy PATCH, `POST /api/employees`, `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/auth-gate.ts` — `allowsDashboardWithoutAuth()` (mock or dev bypass)
- `lib/data-mode.ts` — `getDataMode()`, `isMockMode()`
- `lib/api-data-access.ts` — `resolveApiDataAccess()` (mock vs Supabase vs 401)
- `.env.example` — template variables
