import { redirect } from "next/navigation";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { isMockMode } from "@/lib/data-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (isMockMode()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--board-bg)] px-4">
        <Card className="w-full max-w-md space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Employee Time Tracking</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Mock mode is active</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Supabase authentication is bypassed. Continue directly to the dashboard while backend access is unavailable.
          </p>
          <Link
            href="/overview"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-medium text-[var(--text-on-dark)]"
          >
            Open Dashboard
          </Link>
        </Card>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/overview");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--board-bg)] px-4">
      <Card className="w-full max-w-md space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Employee Time Tracking</p>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Sign in to dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Use your account credentials to access store-scoped time operations.
        </p>
        <LoginForm />
      </Card>
    </main>
  );
}
