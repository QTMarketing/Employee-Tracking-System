"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Building2, Clock, Users } from "lucide-react";

import { fetchDashboardCharts, fetchDashboardKpis } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardKpiItem } from "@/lib/types/domain";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function pick(items: DashboardKpiItem[], key: DashboardKpiItem["key"]) {
  return items.find((i) => i.key === key);
}

const laborCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

type OverviewKpiTileProps = {
  href: string;
  label: string;
  value: string;
  caption: string;
  /** Shown only to screen readers after the visible label. */
  srHint: string;
  icon: typeof Users;
  iconBgClass: string;
  iconClass: string;
  valueClassName?: string;
  className?: string;
};

function OverviewKpiTile({
  href,
  label,
  value,
  caption,
  srHint,
  icon: Icon,
  iconBgClass,
  iconClass,
  valueClassName,
  className,
}: OverviewKpiTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[var(--surface)] p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-shadow outline-none hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
        className,
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            iconBgClass,
          )}
        >
          <Icon className={cn("h-5 w-5", iconClass)} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {label}
            <span className="sr-only"> — {srHint}</span>
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-[var(--text-primary)]",
              valueClassName,
            )}
          >
            {value}
          </p>
          <p className="mt-1.5 text-xs leading-snug text-[var(--text-secondary)]">{caption}</p>
        </div>
      </div>
    </Link>
  );
}

/** Overview strip: active locations, working now, hours today (payroll / profile / OT live in Attention + API). */
export function OperationalOverviewMetrics() {
  const {
    data: kpiData,
    isLoading: kpiLoading,
    isError: kpiError,
    isFetching: kpiFetching,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: queryKeys.dashboardKpis,
    queryFn: fetchDashboardKpis,
  });

  const { data: chartData, isLoading: chartsLoading } = useQuery({
    queryKey: queryKeys.dashboardCharts,
    queryFn: fetchDashboardCharts,
  });

  const laborTotal = useMemo(() => {
    const rows = chartData?.barData ?? [];
    return rows.reduce((sum, r) => sum + r.laborCost, 0);
  }, [chartData]);

  if (kpiLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[128px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] sm:h-[132px]"
          />
        ))}
      </div>
    );
  }

  if (kpiError) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm text-[var(--danger)]">Could not load these numbers.</p>
        <Button type="button" variant="outline" className="mt-3 h-9 text-xs" onClick={() => refetchKpis()}>
          Retry
        </Button>
      </div>
    );
  }

  const kpis = kpiData ?? [];
  const clocked = pick(kpis, "clocked_in");
  const hours = pick(kpis, "total_hours_today");
  const activeStores = pick(kpis, "active_stores");

  const laborShort = chartsLoading
    ? "Rough labor: loading…"
    : `Rough labor ~${laborCompact.format(laborTotal)} (from overview charts)`;

  const hoursCaption = `Today’s recorded hours (regular, OT, double time). ${laborShort}`;

  const fetchDim = kpiFetching && !kpiLoading;

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-3 sm:grid-cols-3",
        fetchDim && "opacity-[0.97] transition-opacity",
      )}
    >
      <OverviewKpiTile
        href="/settings"
        label="Active locations"
        value={activeStores?.value ?? "—"}
        caption={activeStores?.change ?? "Stores in your directory with time rules"}
        srHint="opens settings to review time rules by location"
        icon={Building2}
        iconBgClass="bg-[color-mix(in_oklab,var(--accent)_34%,var(--surface-soft))] ring-1 ring-[color-mix(in_oklab,var(--accent)_22%,transparent)]"
        iconClass="text-[var(--accent-hover)]"
      />
      <OverviewKpiTile
        href="/time-clock"
        label="Working now"
        value={clocked?.value ?? "—"}
        caption={clocked?.preview ?? clocked?.change ?? "People currently clocked in at your locations"}
        srHint="opens time clock to see who is clocked in or on break"
        icon={Users}
        iconBgClass="bg-[color-mix(in_oklab,var(--info)_30%,var(--surface-soft))] ring-1 ring-[color-mix(in_oklab,var(--info)_20%,transparent)]"
        iconClass="text-[var(--info)]"
      />
      <OverviewKpiTile
        href="/reports?focus=labor"
        label="Hours today"
        value={hours?.value ?? "—"}
        caption={hoursCaption}
        srHint="opens labor by store report for cost and hours context"
        icon={Clock}
        iconBgClass="bg-[color-mix(in_oklab,var(--terracotta)_28%,var(--surface-soft))] ring-1 ring-[color-mix(in_oklab,var(--terracotta)_18%,transparent)]"
        iconClass="text-[var(--terracotta)]"
      />
    </div>
  );
}
