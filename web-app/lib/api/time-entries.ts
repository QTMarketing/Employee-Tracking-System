import {
  CreateClockEventInput,
  ActiveTimeEntry,
  ActivityFeedRow,
  DashboardChartData,
  DashboardKpiItem,
  HourMixData,
  HourMixReportData,
  TimeEntryOptions,
} from "@/lib/types/domain";

type TimeEntriesResponse = {
  data: ActiveTimeEntry[];
};

type EntryOptionsResponse = {
  data: TimeEntryOptions;
};

type KpiResponse = {
  data: DashboardKpiItem[];
};

type ActivityResponse = {
  data: ActivityFeedRow[];
};

type ChartResponse = {
  data: DashboardChartData;
};

type HourMixResponse = {
  data: HourMixData;
};

type HourMixReportResponse = {
  data: HourMixReportData;
};

export async function fetchTimeEntries(): Promise<ActiveTimeEntry[]> {
  const response = await fetch("/api/time-entries", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch time entries");
  }
  const payload = (await response.json()) as TimeEntriesResponse;
  return payload.data;
}

export async function createClockEvent(input: CreateClockEventInput): Promise<{ eventId: string }> {
  const response = await fetch("/api/clock-events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to submit clock event");
  }

  return (await response.json()) as { eventId: string };
}

export async function fetchTimeEntryOptions(): Promise<TimeEntryOptions> {
  const response = await fetch("/api/time-entry-options", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch selectable options");
  }
  const payload = (await response.json()) as EntryOptionsResponse;
  return payload.data;
}

export async function fetchDashboardKpis(): Promise<DashboardKpiItem[]> {
  const response = await fetch("/api/dashboard-kpis", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch KPI data");
  }
  const payload = (await response.json()) as KpiResponse;
  return payload.data;
}

export async function fetchActivityFeed(): Promise<ActivityFeedRow[]> {
  const response = await fetch("/api/activity-feed", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch activity feed");
  }
  const payload = (await response.json()) as ActivityResponse;
  return payload.data;
}

export async function fetchDashboardCharts(): Promise<DashboardChartData> {
  const response = await fetch("/api/dashboard-charts", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch chart data");
  }
  const payload = (await response.json()) as ChartResponse;
  return payload.data;
}

export async function fetchHourMix(): Promise<HourMixData> {
  const response = await fetch("/api/hour-mix", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch hour mix");
  }
  const payload = (await response.json()) as HourMixResponse;
  return payload.data;
}

export async function fetchHourMixReport(): Promise<HourMixReportData> {
  const response = await fetch("/api/hour-mix-report", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to fetch hour mix report");
  }
  const payload = (await response.json()) as HourMixReportResponse;
  return payload.data;
}
