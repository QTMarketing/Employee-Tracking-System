import Link from "next/link";

import { Card } from "@/components/ui/card";

type DashboardStubProps = {
  title: string;
  description: string;
  bullets?: string[];
};

export function DashboardStub({ title, description, bullets }: DashboardStubProps) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      <Card className="max-w-2xl border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">Coming next</p>
        {bullets && bullets.length > 0 ? (
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-[var(--text-secondary)]">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This area will connect to Supabase and PRD workflows in a future iteration.
          </p>
        )}
        <Link
          href="/overview"
          className="mt-4 inline-flex text-sm font-medium text-[var(--secondary)] hover:underline"
        >
          ← Back to overview
        </Link>
      </Card>
    </div>
  );
}
