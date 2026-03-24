"use client";

import dynamic from "next/dynamic";

import { ActivityFeedTable } from "@/components/dashboard/activity-feed-table";
import { OperationalOverviewMetrics } from "@/components/dashboard/operational-overview-metrics";
import { OverviewAttentionPanel } from "@/components/dashboard/overview-attention-panel";
import { TimeEntriesTable } from "@/components/dashboard/time-entries-table";

const HoursCharts = dynamic(() => import("@/components/dashboard/hours-charts").then((mod) => mod.HoursCharts), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse rounded-xl bg-[var(--surface-soft)]" />,
});

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <OperationalOverviewMetrics />

      <HoursCharts />

      <OverviewAttentionPanel />

      <ActivityFeedTable className="min-w-0" />

      <TimeEntriesTable />
    </div>
  );
}
