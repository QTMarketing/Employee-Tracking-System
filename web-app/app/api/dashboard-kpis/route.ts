import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockKpis } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardKpiItem } from "@/lib/types/domain";

function toStringMetric(value: number) {
  return Intl.NumberFormat("en-US").format(Math.round(value * 100) / 100);
}

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: getMockKpis() });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const [{ count: activeCount, error: activeError }, { count: flaggedCount, error: flaggedError }] =
      await Promise.all([
        supabase
          .from("time_entries")
          .select("*", { count: "exact", head: true })
          .in("status", ["clocked_in", "on_break"])
          .is("clock_out_at", null),
        supabase.from("time_entries").select("*", { count: "exact", head: true }).eq("status", "flagged"),
      ]);

    if (activeError || flaggedError) {
      return NextResponse.json({ error: activeError?.message ?? flaggedError?.message }, { status: 500 });
    }

    const { data: totalRows, error: totalHoursError } = await supabase
      .from("time_entries")
      .select("regular_hours, ot_hours, dt_hours")
      .gte("clock_in_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());

    if (totalHoursError) {
      return NextResponse.json({ error: totalHoursError.message }, { status: 500 });
    }

    const { count: manualEventsCount, error: manualEventsError } = await supabase
      .from("time_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "admin_manual")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (manualEventsError) {
      return NextResponse.json({ error: manualEventsError.message }, { status: 500 });
    }

    const totalHours = (totalRows ?? []).reduce(
      (sum, row) => sum + Number(row.regular_hours ?? 0) + Number(row.ot_hours ?? 0) + Number(row.dt_hours ?? 0),
      0,
    );

    const kpis: DashboardKpiItem[] = [
      {
        label: "Currently Clocked In",
        value: String(activeCount ?? 0),
        change: "Live",
        tone: "primary",
      },
      {
        label: "Pending Approvals",
        value: String(manualEventsCount ?? 0),
        change: "Manual events (24h)",
        tone: "warning",
      },
      {
        label: "Flagged Short Entries",
        value: String(flaggedCount ?? 0),
        change: "Needs review",
        tone: "accent",
      },
      {
        label: "Total Hours Today",
        value: toStringMetric(totalHours),
        change: "UTC day aggregate",
        tone: "success",
      },
    ];

    return NextResponse.json({ data: kpis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
