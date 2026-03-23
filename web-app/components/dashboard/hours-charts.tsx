"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchDashboardCharts } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";

import { Card } from "@/components/ui/card";

const MAX_STORES_IN_CARD = 6;

function shortenStoreLabel(label: string): string {
  return label.length > 10 ? `${label.slice(0, 10)}...` : label;
}

export function HoursCharts() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboardCharts,
    queryFn: fetchDashboardCharts,
  });

  const lineData = useMemo(() => data?.lineData ?? [], [data]);
  const barData = useMemo(() => data?.barData ?? [], [data]);
  const displayBarData = useMemo(() => {
    const sorted = [...barData].sort((a, b) => b.laborCost - a.laborCost);
    if (sorted.length <= MAX_STORES_IN_CARD) {
      return sorted;
    }

    const top = sorted.slice(0, MAX_STORES_IN_CARD - 1);
    const rest = sorted.slice(MAX_STORES_IN_CARD - 1);
    const restLaborCost = rest.reduce((sum, item) => sum + item.laborCost, 0);
    const restLaborPct =
      rest.length > 0 ? Math.round(rest.reduce((sum, item) => sum + item.laborPct, 0) / rest.length) : 0;

    return [
      ...top,
      {
        store: "Other",
        laborCost: restLaborCost,
        laborPct: restLaborPct,
      },
    ];
  }, [barData]);
  const hiddenStoreCount = Math.max(0, barData.length - (MAX_STORES_IN_CARD - 1));

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Hours and Overtime Trend</h3>
        <div className="h-60 min-h-60">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-xl bg-[var(--surface-soft)]" />
          ) : isError ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm text-[var(--danger)]">
              Failed to load chart data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="var(--accent)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="ot" stroke="var(--info)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Labor Cost by Store</h3>
          <Link
            href="/reports/labor-by-store"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          >
            View full report
          </Link>
        </div>
        {hiddenStoreCount > 0 ? (
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Showing top {MAX_STORES_IN_CARD - 1} stores. {hiddenStoreCount} grouped as Other.
          </p>
        ) : null}
        <div className="h-60 min-h-60">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-xl bg-[var(--surface-soft)]" />
          ) : isError ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm text-[var(--danger)]">
              Failed to load chart data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <BarChart data={displayBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="store" stroke="var(--text-muted)" tickFormatter={shortenStoreLabel} />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip />
                <Bar dataKey="laborCost" fill="var(--secondary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </section>
  );
}
