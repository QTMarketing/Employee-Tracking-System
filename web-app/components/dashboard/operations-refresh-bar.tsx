"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { queryKeys } from "@/lib/query-keys";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useOperationsRefresh() {
  const queryClient = useQueryClient();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardKpis }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCharts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activityFeed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries }),
      ]);
      setLastRefreshAt(new Date());
    } finally {
      setBusy(false);
    }
  }, [queryClient]);

  return { refresh, busy, lastRefreshAt };
}

type OperationsRefreshButtonProps = {
  className?: string;
  showLastRefresh?: boolean;
};

export function OperationsRefreshButton({ className, showLastRefresh = false }: OperationsRefreshButtonProps) {
  const { refresh, busy, lastRefreshAt } = useOperationsRefresh();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLastRefresh && lastRefreshAt ? (
        <span className="hidden text-[11px] tabular-nums text-[var(--text-muted)] sm:inline">
          {lastRefreshAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="h-9 gap-1.5 px-3 text-xs font-medium"
        disabled={busy}
        onClick={() => void refresh()}
      >
        <RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden />
        {busy ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}

/** One-line scope hint + ⓘ detail; keeps the overview from feeling like a manual. */
export function DataScopeHint() {
  const longHelp =
    "You only see locations you are allowed to view. Use Timesheets to approve time for payroll. Use Reports for downloads and summaries.";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)] shadow-[0_1px_0_rgba(24,20,32,0.03)]">
      <span className="font-medium text-[var(--text-primary)]">Data:</span>
      <span>Only your locations.</span>
      <Link href="/timesheets" className="font-medium text-[var(--secondary)] underline-offset-2 hover:underline">
        Timesheets
      </Link>
      <span className="text-[var(--text-muted)]">·</span>
      <Link href="/reports" className="font-medium text-[var(--secondary)] underline-offset-2 hover:underline">
        Reports
      </Link>
      <button
        type="button"
        className="ml-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
        aria-label={longHelp}
        title={longHelp}
      >
        <Info size={16} aria-hidden />
      </button>
    </div>
  );
}

/** @deprecated Prefer DataScopeHint on overview + OperationsRefreshButton in the top bar. */
export function OperationsRefreshBar() {
  const { refresh, busy, lastRefreshAt } = useOperationsRefresh();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs leading-relaxed text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">What you see:</span> every location you can access here.{" "}
        <span className="text-[var(--text-muted)]">
          For approvals and payroll-ready time, open{" "}
          <Link href="/timesheets" className="font-medium text-[var(--secondary)] underline-offset-2 hover:underline">
            Timesheets
          </Link>
          .
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {lastRefreshAt ? (
          <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
            Refreshed {lastRefreshAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden />
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
