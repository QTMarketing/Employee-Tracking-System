"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HTMLAttributes } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { fetchHourMix } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Card } from "@/components/ui/card";

const SEGMENT_COLORS = ["var(--secondary)", "var(--accent)", "var(--terracotta)"];

export function HourMixPie({ className }: HTMLAttributes<HTMLDivElement>) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.hourMix,
    queryFn: fetchHourMix,
  });

  const segments = data?.segments ?? [];
  const totalHours = data?.totalHours ?? 0;

  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <SectionHeader
        className="mb-3 shrink-0"
        title="Hour mix"
        description="Share of regular, overtime, and double time among people with an open shift."
        actions={
          <Link
            href="/reports?focus=hour-mix"
            className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          >
            View full report
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
        <div className="h-44 w-44 shrink-0 min-h-0 sm:h-48 sm:w-48">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-xl bg-[var(--surface-soft)]" />
          ) : isError ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm text-[var(--danger)]">
              Failed to load hour mix.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={192}>
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {segments.map((segment, index) => (
                    <Cell key={segment.name} fill={SEGMENT_COLORS[index] ?? "var(--warning)"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex w-full min-w-0 max-w-[220px] flex-col justify-center sm:w-auto">
          <div className="mb-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>Total</span>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
              {totalHours.toFixed(1)} hrs
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            {segments.map((segment, index) => (
              <li key={segment.name} className="flex items-center gap-2">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[index] ?? "var(--warning)" }}
                  />
                  <span className="truncate">{segment.name}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-[var(--text-primary)]">
                  {segment.value.toFixed(1)} hrs
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
