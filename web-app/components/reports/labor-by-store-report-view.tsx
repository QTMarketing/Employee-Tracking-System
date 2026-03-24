"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchDashboardCharts } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LaborByStoreReportViewProps = {
  /** Hide breadcrumb and “Back to overview” when rendered inside the combined Reports page. */
  embedded?: boolean;
};

export function LaborByStoreReportView({ embedded = false }: LaborByStoreReportViewProps) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.dashboardCharts,
    queryFn: fetchDashboardCharts,
  });

  const barData = useMemo(() => {
    const rows = data?.barData ?? [];
    return [...rows].sort((a, b) => b.laborCost - a.laborCost);
  }, [data?.barData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_8%,var(--surface))] p-6 text-sm text-[var(--danger)]">
        <p>Could not load this report.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-9 text-xs" disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
          <Link
            href="/overview"
            className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          >
            Back to overview
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {!embedded ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="mb-2 text-xs text-[var(--text-muted)]">
              <Link href="/reports" className="hover:text-[var(--text-primary)]">
                Reports
              </Link>
              <span className="mx-1.5 text-[var(--border)]">/</span>
              <span className="text-[var(--text-secondary)]">Labor by store</span>
            </nav>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Rough labor cost from current hours and the rates set in the system. Compare locations here, then confirm
              numbers with your payroll team and official pay rules.
            </p>
          </div>
          <Link
            href="/overview"
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          >
            Back to overview
          </Link>
        </div>
      ) : null}

      <Card className="border-[var(--border)] bg-[var(--surface)] p-5">
        <SectionHeader
          as="h2"
          title="Labor cost"
          description="Estimated cost by location from today’s hours and pay rates. Double-check with payroll before you finalize pay."
        />
        <div className="mt-4 h-80 min-h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="store" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, "Labor cost"]} />
              <Bar dataKey="laborCost" fill="var(--secondary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">By location</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-3">Store</th>
                <th className="px-5 py-3 text-right tabular-nums">Labor cost</th>
                <th className="px-5 py-3 text-right tabular-nums">Share of total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {barData.map((row) => (
                <tr key={row.store} className="hover:bg-[var(--surface-soft)]/80">
                  <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{row.store}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    ${row.laborCost.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[var(--text-secondary)]">{row.laborPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
