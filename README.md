# HR System

Workforce time and attendance: multi-store operations, time clock, timesheets, reports, and HR dashboard.

The Next.js application lives in [`web-app/`](./web-app/). See [web-app/README.md](./web-app/README.md) for setup, `DATA_MODE`, and Supabase.

## Deploy on Vercel

If the live URL shows **404: NOT_FOUND** (Vercel’s generic error), the project is almost certainly building from the **repo root**, where there is no Next.js app.

1. Open the project on [Vercel](https://vercel.com) → **Settings** → **General**.
2. Under **Root Directory**, set **`web-app`**, then save.
3. **Deployments** → open the latest deployment → **⋯** → **Redeploy** (or push a new commit).

Vercel should detect **Next.js**; leave **Build Command** and **Output** as defaults (`next build` / managed by Vercel).

4. **Settings** → **Environment Variables**: add the same keys you use locally (at minimum `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if you use `DATA_MODE=api`). For a quick public demo you can set **`DATA_MODE=mock`** so the dashboard works without Supabase.

## Rename this repository on GitHub (optional)

To match this name in the URL (e.g. `github.com/QTMarketing/HR-System`):

1. Open the repo on GitHub → **Settings** → **General**.
2. Under **Repository name**, enter `HR-System` (or `hr-system`), then **Rename**.
3. Update your local remote:

   ```bash
   git remote set-url origin https://github.com/QTMarketing/HR-System.git
   ```

   Use the exact name you chose on GitHub.

4. Confirm: `git remote -v`

GitHub [redirects](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) old URLs to the new name, but updating the remote avoids confusion.
