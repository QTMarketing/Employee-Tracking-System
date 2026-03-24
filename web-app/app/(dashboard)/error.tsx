"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-8">
      <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        This page couldn&apos;t load
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{error.message}</p>
      <Button className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
