"use client";

import dynamic from "next/dynamic";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import { TimeEntriesTable } from "@/components/dashboard/time-entries-table";
import { TimeEntryDialog } from "@/components/dashboard/time-entry-dialog";

const HoursCharts = dynamic(() => import("@/components/dashboard/hours-charts").then((mod) => mod.HoursCharts), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />,
});

const ActivityFeed = dynamic(() => import("@/components/dashboard/activity-feed").then((mod) => mod.ActivityFeed), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-[var(--surface-soft)]" />,
});

const HourMixPie = dynamic(
  () => import("@/components/dashboard/hour-mix-pie").then((mod) => mod.HourMixPie),
  {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-[var(--surface-soft)]" />,
  },
);

export default function OverviewPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Focus: approvals, flags, and payroll-ready hour visibility across stores.
        </p>
        <TimeEntryDialog />
      </div>

      <KpiCards />

      <HoursCharts />

      <section className="grid gap-4 xl:grid-cols-2">
        <ActivityFeed className="h-[300px]" />
        <HourMixPie className="h-[300px]" />
      </section>

      <TimeEntriesTable />
    </div>
  );
}
