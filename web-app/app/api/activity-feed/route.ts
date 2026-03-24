import { NextResponse } from "next/server";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import { getMockActivityFeedRows } from "@/lib/mock/time-tracking-store";
import type { ActivityFeedRow } from "@/lib/types/domain";

function eventTypeDisplay(eventType: string): string {
  if (eventType === "clock_in") return "Clock in";
  if (eventType === "clock_out") return "Clock out";
  if (eventType === "break_start") return "Break start";
  if (eventType === "break_end") return "Break end";
  return "Manual adjustment";
}

function shiftStatusLabel(status: string | null): string {
  if (!status) return "—";
  if (status === "clocked_in") return "Clocked in";
  if (status === "on_break") return "On break";
  if (status === "flagged") return "Flagged";
  if (status === "clocked_out") return "Clocked out";
  return status;
}

export async function GET() {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (access.kind === "mock") {
      return NextResponse.json({ data: getMockActivityFeedRows() });
    }

    const supabase = access.supabase;

    const { data: events, error } = await supabase
      .from("time_events")
      .select("id, employee_id, store_id, event_type, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employeeIds = Array.from(new Set((events ?? []).map((event) => event.employee_id)));
    const storeIds = Array.from(new Set((events ?? []).map((event) => event.store_id)));

    const [{ data: employeeRows, error: employeeError }, { data: storeRows, error: storeError }] = await Promise.all([
      supabase.from("users").select("id, full_name").in("id", employeeIds),
      supabase.from("stores").select("id, name").in("id", storeIds),
    ]);

    const openShiftsResult =
      employeeIds.length > 0
        ? await supabase
            .from("time_entries")
            .select("employee_id, status, ot_hours, dt_hours")
            .in("employee_id", employeeIds)
            .is("clock_out_at", null)
        : { data: [] as { employee_id: string; status: string; ot_hours: number | null; dt_hours: number | null }[], error: null };

    const openShifts = openShiftsResult.data;
    const shiftsError = openShiftsResult.error;

    if (employeeError || storeError || shiftsError) {
      return NextResponse.json({ error: employeeError?.message ?? storeError?.message ?? shiftsError?.message }, { status: 500 });
    }

    const employeeMap = new Map((employeeRows ?? []).map((row) => [row.id, row.full_name]));
    const storeMap = new Map((storeRows ?? []).map((row) => [row.id, row.name]));
    const shiftByEmployee = new Map(
      (openShifts ?? []).map((row) => [
        row.employee_id,
        {
          status: row.status as string,
          ot: Number(row.ot_hours ?? 0),
          dt: Number(row.dt_hours ?? 0),
        },
      ]),
    );

    const rows: ActivityFeedRow[] = (events ?? []).map((event) => {
      const employeeName = employeeMap.get(event.employee_id) ?? "Employee";
      const storeName = storeMap.get(event.store_id) ?? "Store";
      const shift = shiftByEmployee.get(event.employee_id);
      const et = event.event_type as string;

      let exception: string | null = null;
      if (shift?.status === "flagged") {
        exception = "Flagged shift — review hours";
      } else if (et === "admin_manual") {
        exception = "Manual time correction";
      } else if (shift && (shift.ot > 0 || shift.dt > 0)) {
        exception = "OT/DT on open shift";
      }

      return {
        id: event.id,
        employeeName,
        eventType: eventTypeDisplay(et),
        eventTypeKey: et,
        occurredAt: event.occurred_at,
        shiftStatus: shiftStatusLabel(shift?.status ?? null),
        exception,
        storeName,
      };
    });

    rows.sort((a, b) => {
      const crit = (a.exception ? 1 : 0) - (b.exception ? 1 : 0);
      if (crit !== 0) return -crit;
      return a.occurredAt < b.occurredAt ? 1 : -1;
    });

    return NextResponse.json({ data: rows.slice(0, 12) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
