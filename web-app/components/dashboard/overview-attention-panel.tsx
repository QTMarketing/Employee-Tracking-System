"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { fetchDashboardKpis } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardKpiItem } from "@/lib/types/domain";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function pick(items: DashboardKpiItem[], key: DashboardKpiItem["key"]) {
  return items.find((i) => i.key === key);
}

function parseCount(value: string): number {
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Payroll + flagged summary between KPI row and charts */
export function OverviewAttentionPanel({ className }: { className?: string }) {
  const { data: kpis = [], isLoading: kpiLoading } = useQuery({
    queryKey: queryKeys.dashboardKpis,
    queryFn: fetchDashboardKpis,
  });

  const flagged = pick(kpis, "flagged_short_entries");
  const pendingPayroll = pick(kpis, "pending_approvals");
  const profileGaps = pick(kpis, "profile_gaps");
  const flaggedN = flagged ? parseCount(flagged.value) : 0;
  const payrollN = pendingPayroll ? parseCount(pendingPayroll.value) : 0;
  const profileGapN = profileGaps ? parseCount(profileGaps.value) : 0;
  const alertCount = flaggedN + payrollN + profileGapN;

  return (
    <Card className={cn("border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Attention</h2>
        {!kpiLoading && alertCount > 0 ? (
          <span className="rounded-full bg-[color-mix(in_oklab,var(--terracotta)_14%,var(--surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--terracotta)]">
            {alertCount} open
          </span>
        ) : null}
      </div>
      {kpiLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-16 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {payrollN > 0 ? (
            <li className="rounded-lg border border-[color-mix(in_oklab,var(--warning)_35%,var(--border))] bg-[var(--attention-panel-bg)] p-3">
              <p className="font-medium text-[var(--text-primary)]">Payroll approval</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {payrollN} closed shift{payrollN === 1 ? "" : "s"} in the last 14 days need a payroll OK.
              </p>
              <Link
                href="/timesheets"
                className="mt-2 inline-block text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                Open timesheets →
              </Link>
            </li>
          ) : null}
          {flaggedN > 0 ? (
            <li className="flex gap-2 rounded-lg border border-[color-mix(in_oklab,var(--danger)_28%,var(--border))] bg-[color-mix(in_oklab,var(--danger)_6%,var(--surface))] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-solid)]" aria-hidden />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Flagged shifts</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {flaggedN} shift{flaggedN === 1 ? "" : "s"} marked flagged — review on the time clock.
                </p>
                <Link
                  href="/time-clock"
                  className="mt-2 inline-block text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Open time clock →
                </Link>
              </div>
            </li>
          ) : null}
          {profileGapN > 0 ? (
            <li className="rounded-lg border border-[color-mix(in_oklab,var(--warning)_35%,var(--border))] bg-[var(--attention-panel-bg)] p-3">
              <p className="font-medium text-[var(--text-primary)]">Employee data</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {profileGapN} active employee{profileGapN === 1 ? "" : "s"} need a store assignment or hourly rate.
              </p>
              {profileGaps?.preview ? (
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{profileGaps.preview}</p>
              ) : null}
              <Link
                href="/employees"
                className="mt-2 inline-block text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                Open employees →
              </Link>
            </li>
          ) : null}
          {alertCount === 0 ? (
            <li className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-4 text-center text-xs text-[var(--text-secondary)] sm:col-span-2 lg:col-span-3">
              No payroll, flagged, or profile items need attention.
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
