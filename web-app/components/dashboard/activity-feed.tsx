"use client";

import { useQuery } from "@tanstack/react-query";
import { HTMLAttributes } from "react";

import { fetchActivityFeed } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";

export function ActivityFeed({ className }: HTMLAttributes<HTMLDivElement>) {
  const { data: activity = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.activityFeed,
    queryFn: fetchActivityFeed,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Daily Activity</h3>
        <span className="text-xs text-[var(--text-muted)]">Live</span>
      </div>
      {isLoading ? <div className="h-32 flex-none animate-pulse rounded-xl bg-[var(--surface-soft)]" /> : null}
      {isError ? <p className="flex-none text-sm text-[var(--danger)]">Activity feed failed to load.</p> : null}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ul className="space-y-3">
        {activity.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span>{item}</span>
          </li>
        ))}
        </ul>
      </div>
    </Card>
  );
}
