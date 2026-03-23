"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchHourMixReport } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { TimeEntryStatus } from "@/lib/types/domain";

import { Card } from "@/components/ui/card";

const SEGMENT_COLORS = ["var(--secondary)", "var(--accent)", "var(--info)"] as const;

function statusLabel(status: TimeEntryStatus): string {
  switch (status) {
    case "clocked_in":
      return "Clocked in";
    case "on_break":
      return "On break";
    case "flagged":
      return "Flagged";
    case "clocked_out":
      return "Clocked out";
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: TimeEntryStatus }) {
  const styles: Record<TimeEntryStatus, string> = {
    clocked_in: "bg-[color-mix(in_oklab,var(--secondary)_22%,transparent)] text-[var(--text-primary)]",
    on_break: "bg-[color-mix(in_oklab,var(--warning)_24%,transparent)] text-[var(--text-primary)]",
    flagged: "bg-[color-mix(in_oklab,var(--danger)_20%,transparent)] text-[var(--danger)]",
    clocked_out: "bg-[var(--surface-soft)] text-[var(--text-muted)]",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export function HourMixReportView() {
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.hourMixReport,
    queryFn: fetchHourMixReport,
  });

  const segments = data?.summary.segments ?? [];

  const byStoreChart = useMemo(() => data?.byStore ?? [], [data?.byStore]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_8%,var(--surface))] p-6 text-sm text-[var(--danger)]">
        Could not load this report.{" "}
        <Link href="/overview" className="font-medium underline underline-offset-2">
          Back to overview
        </Link>
      </Card>
    );
  }

  const generated = new Date(data.generatedAt);
  const generatedLabel = generated.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 text-xs text-[var(--text-muted)]">
            <Link href="/reports" className="hover:text-[var(--text-primary)]">
              Reports
            </Link>
            <span className="mx-1.5 text-[var(--border)]">/</span>
            <span className="text-[var(--text-secondary)]">Hour mix</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Hour mix report</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{data.scopeDescription}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Generated {generatedLabel}</p>
        </div>
        <Link
          href="/overview"
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
        >
          Back to overview
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Total hours</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {data.summary.totalHours.toFixed(1)}
          </p>
        </Card>
        {data.summary.segments.map((seg, i) => (
          <Card key={seg.name} className="border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[i] ?? "var(--warning)" }} />
              {seg.name}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
              {seg.value.toFixed(1)} hrs
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Composition</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Click a slice to highlight; click again to clear.</p>
          <div className="mt-4 h-72 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={108}
                  paddingAngle={2}
                  onClick={(_, index) => setActiveSlice((prev) => (prev === index ? null : index))}
                  cursor="pointer"
                >
                  {segments.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={SEGMENT_COLORS[index] ?? "var(--warning)"}
                      opacity={activeSlice === null || activeSlice === index ? 1 : 0.35}
                      stroke={activeSlice === index ? "var(--text-primary)" : "transparent"}
                      strokeWidth={activeSlice === index ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(1)} hrs`, "Hours"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">By store</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Stacked regular, OT, and DT for active shifts.</p>
          <div className="mt-4 h-72 min-h-[280px] w-full">
            {byStoreChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No active shifts in scope.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                <BarChart layout="vertical" data={byStoreChart} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="storeName"
                    width={88}
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="regularHours" stackId="mix" fill="var(--secondary)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="otHours" stackId="mix" fill="var(--accent)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="dtHours" stackId="mix" fill="var(--info)" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">By employee</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Active shifts with current hour buckets.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Store</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right tabular-nums">Regular</th>
                <th className="px-5 py-3 text-right tabular-nums">OT</th>
                <th className="px-5 py-3 text-right tabular-nums">DT</th>
                <th className="px-5 py-3 text-right tabular-nums">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.byEmployee.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    No rows in scope.
                  </td>
                </tr>
              ) : (
                data.byEmployee.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-[var(--surface-soft)]/80">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{row.employeeName}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{row.employeeCode}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{row.storeName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {row.regularHours.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {row.otHours.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {row.dtHours.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                      {row.totalHours.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
