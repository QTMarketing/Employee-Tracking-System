import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockActiveShifts } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActiveTimeEntry } from "@/lib/types/domain";

function mapStatus(status: string): ActiveTimeEntry["status"] {
  if (status === "on_break") return "on_break";
  if (status === "clocked_out") return "clocked_out";
  if (status === "flagged") return "flagged";
  return "clocked_in";
}

export async function GET() {
  try {
    if (isMockMode()) {
      const rows = getMockActiveShifts();
      return NextResponse.json({ data: rows, count: rows.length });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("active_time_entries_view")
      .select("*")
      .in("status", ["clocked_in", "on_break"])
      .order("employee_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: ActiveTimeEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: row.employee_code ?? "N/A",
      employeeName: row.employee_name,
      storeId: row.store_id,
      storeName: row.store_name,
      status: mapStatus(row.status),
      regularHours: Number(row.regular_hours ?? 0),
      otHours: Number(row.ot_hours ?? 0),
      dtHours: Number(row.dt_hours ?? 0),
    }));

    return NextResponse.json({ data: rows, count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
