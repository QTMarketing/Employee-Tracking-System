"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Info } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchDashboardCharts } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Card } from "@/components/ui/card";

const MAX_STORES_IN_CARD = 6;

const PERIOD_HELP =
  "These charts use the same period as this overview (not locked to a pay period). For payroll-ready totals, use Timesheets and Reports.";

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

  const lineInsights = useMemo(() => {
    if (!lineData.length) return null;
    let maxH = -1;
    let maxHi = 0;
    let maxOt = -1;
    let maxOti = 0;
    lineData.forEach((d, i) => {
      if (d.hours > maxH) {
        maxH = d.hours;
        maxHi = i;
      }
      if (d.ot > maxOt) {
        maxOt = d.ot;
        maxOti = i;
      }
    });
    const avgH = lineData.reduce((s, d) => s + d.hours, 0) / lineData.length;
    const peak = lineData[maxHi]!;
    const otPeak = lineData[maxOti]!;
    return { avgH, peakDay: peak.day, peakH: peak.hours, otDay: otPeak.day, maxOt: otPeak.ot };
  }, [lineData]);

  const displayBarData = useMemo(() => {
    const sorted = [...barData].sort((a, b) => b.laborCost - a.laborCost);
    if (sorted.length <= MAX_STORES_IN_CARD) {
      return sorted;
    }

    const fullTotal = sorted.reduce((sum, item) => sum + item.laborCost, 0);
    const top = sorted.slice(0, MAX_STORES_IN_CARD - 1);
    const rest = sorted.slice(MAX_STORES_IN_CARD - 1);
    const restLaborCost = rest.reduce((sum, item) => sum + item.laborCost, 0);
    const restLaborPct =
      fullTotal > 0 && rest.length > 0 ? Math.round((restLaborCost / fullTotal) * 100) : 0;

    return [
      ...top,
      {
        store: "Other",
        laborCost: restLaborCost,
        laborPct: restLaborPct,
      },
    ];
  }, [barData]);

  const barInsights = useMemo(() => {
    if (!displayBarData.length) return null;
    const sorted = [...displayBarData].sort((a, b) => b.laborCost - a.laborCost);
    const top = sorted[0]!;
    const second = sorted[1];
    const total = displayBarData.reduce((s, x) => s + x.laborCost, 0);
    const topShare = total > 0 ? Math.round((top.laborCost / total) * 100) : 0;
    const skewed = second ? top.laborCost >= second.laborCost * 1.75 : false;
    const maxIdx = displayBarData.findIndex((r) => r.store === top.store);
    return { top, topShare, skewed, maxIdx: maxIdx >= 0 ? maxIdx : 0 };
  }, [displayBarData]);

  const hiddenStoreCount = Math.max(0, barData.length - (MAX_STORES_IN_CARD - 1));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Hours and labor cost</h2>
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              title={PERIOD_HELP}
              aria-label={PERIOD_HELP}
            >
              <Info size={16} aria-hidden />
            </button>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Recent regular and overtime hours, and labor cost by location. Short notes under each chart highlight highs
            and lows.
          </p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader
            className="mb-3"
            title="Regular and overtime by day"
            description="Gray dashed line = average regular hours for the week."
            actions={
              <Link
                href="/reports?focus=hour-mix"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
              >
                Hour mix report
              </Link>
            }
          />
          <div className="h-60 min-h-60">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-[var(--surface-soft)]" />
            ) : isError ? (
              <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm text-[var(--danger)]">
                Could not load chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {lineInsights ? (
                    <ReferenceLine
                      y={lineInsights.avgH}
                      stroke="var(--text-muted)"
                      strokeDasharray="5 5"
                      strokeOpacity={0.85}
                    />
                  ) : null}
                  <Line type="monotone" dataKey="hours" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ot" stroke="var(--terracotta)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {lineInsights && !isLoading && !isError ? (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Most regular hours:</span> {lineInsights.peakDay}{" "}
              ({lineInsights.peakH}h).
              {lineInsights.maxOt > 0 ? (
                <>
                  {" "}
                  <span className="font-medium text-[var(--text-primary)]">Most overtime:</span> {lineInsights.otDay}{" "}
                  ({lineInsights.maxOt}h).
                </>
              ) : null}
            </p>
          ) : null}
        </Card>

        <Card>
          <SectionHeader
            className="mb-3"
            title="Labor cost by location"
            description="Bright bar = highest labor cost in this view."
            actions={
              <Link
                href="/reports?focus=labor"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
              >
                Labor report
              </Link>
            }
          />
          {hiddenStoreCount > 0 ? (
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Showing top {MAX_STORES_IN_CARD - 1} locations; {hiddenStoreCount} combined as “Other.”
            </p>
          ) : null}
          <div className="h-60 min-h-60">
            {isLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-[var(--surface-soft)]" />
            ) : isError ? (
              <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-soft)] text-sm text-[var(--danger)]">
                Could not load chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <BarChart data={displayBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="store" stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={shortenStoreLabel} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="laborCost" radius={[8, 8, 0, 0]}>
                    {displayBarData.map((entry, index) => (
                      <Cell
                        key={entry.store}
                        fill={barInsights && index === barInsights.maxIdx ? "var(--accent)" : "var(--secondary)"}
                        fillOpacity={barInsights && index === barInsights.maxIdx ? 1 : 0.88}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {barInsights && !isLoading && !isError ? (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{barInsights.top.store}</span> carries ~{barInsights.topShare}%
              of estimated labor cost
              {barInsights.skewed ? " — spending is uneven; check pay rates before moving staff between sites." : "."}
            </p>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
