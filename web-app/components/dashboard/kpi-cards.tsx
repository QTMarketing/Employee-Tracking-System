"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchDashboardKpis } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function KpiCards() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboardKpis,
    queryFn: fetchDashboardKpis,
  });

  const kpis = data ?? [];

  if (isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-28 animate-pulse bg-[var(--surface-soft)]" />
        ))}
      </section>
    );
  }

  if (isError) {
    return (
      <Card>
        <p className="text-sm text-[var(--danger)]">KPI metrics failed to load.</p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{kpi.label}</p>
            <Badge tone={kpi.tone}>{kpi.change}</Badge>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{kpi.value}</p>
        </Card>
      ))}
    </section>
  );
}
