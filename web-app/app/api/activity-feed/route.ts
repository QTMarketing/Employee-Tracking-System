import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockActivityFeed } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function eventLabel(eventType: string) {
  if (eventType === "clock_in") return "clocked in";
  if (eventType === "clock_out") return "clocked out";
  if (eventType === "break_start") return "started break";
  if (eventType === "break_end") return "ended break";
  return "added manual event";
}

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: getMockActivityFeed() });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: events, error } = await supabase
      .from("time_events")
      .select("id, employee_id, store_id, event_type, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employeeIds = Array.from(new Set((events ?? []).map((event) => event.employee_id)));
    const storeIds = Array.from(new Set((events ?? []).map((event) => event.store_id)));

    const [{ data: employeeRows, error: employeeError }, { data: storeRows, error: storeError }] = await Promise.all([
      supabase.from("users").select("id, full_name").in("id", employeeIds),
      supabase.from("stores").select("id, name").in("id", storeIds),
    ]);

    if (employeeError || storeError) {
      return NextResponse.json({ error: employeeError?.message ?? storeError?.message }, { status: 500 });
    }

    const employeeMap = new Map((employeeRows ?? []).map((row) => [row.id, row.full_name]));
    const storeMap = new Map((storeRows ?? []).map((row) => [row.id, row.name]));

    const data = (events ?? []).map((event) => {
      const employeeName = employeeMap.get(event.employee_id) ?? "Employee";
      const storeName = storeMap.get(event.store_id) ?? "Store";
      const localTime = new Date(event.occurred_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${employeeName} ${eventLabel(event.event_type)} at ${storeName} (${localTime})`;
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
