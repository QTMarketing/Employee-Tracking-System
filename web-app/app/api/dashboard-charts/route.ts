import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockDashboardCharts } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardChartData } from "@/lib/types/domain";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: getMockDashboardCharts() });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("clock_in_at, regular_hours, ot_hours, dt_hours, store_id")
      .gte("clock_in_at", start.toISOString());

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const { data: stores, error: storesError } = await supabase.from("stores").select("id, name");
    if (storesError) {
      return NextResponse.json({ error: storesError.message }, { status: 500 });
    }

    const storeMap = new Map((stores ?? []).map((store) => [store.id, store.name]));

    const lineAgg = new Map<string, { hours: number; ot: number }>();
    const barAgg = new Map<string, { laborCost: number; laborPct: number }>();

    for (const row of entries ?? []) {
      const date = new Date(row.clock_in_at);
      const day = DAYS[date.getDay()] ?? "N/A";
      const hours = Number(row.regular_hours ?? 0);
      const ot = Number(row.ot_hours ?? 0);
      const dt = Number(row.dt_hours ?? 0);

      const existingDay = lineAgg.get(day) ?? { hours: 0, ot: 0 };
      lineAgg.set(day, {
        hours: Math.round((existingDay.hours + hours + ot + dt) * 100) / 100,
        ot: Math.round((existingDay.ot + ot + dt) * 100) / 100,
      });

      const storeName = storeMap.get(row.store_id) ?? "Store";
      const weightedHours = hours + ot * 1.5 + dt * 2;
      const existingStore = barAgg.get(storeName) ?? { laborCost: 0, laborPct: 0 };
      const nextLaborCost = existingStore.laborCost + weightedHours * 25;
      barAgg.set(storeName, {
        laborCost: Math.round(nextLaborCost),
        laborPct: Math.max(10, Math.min(40, Math.round((nextLaborCost / 400) * 10))),
      });
    }

    const lineData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
      const item = lineAgg.get(day) ?? { hours: 0, ot: 0 };
      return { day, hours: item.hours, ot: item.ot };
    });

    const barData = Array.from(barAgg.entries()).map(([store, value]) => ({
      store,
      laborCost: value.laborCost,
      laborPct: value.laborPct,
    }));

    const payload: DashboardChartData = { lineData, barData };
    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
