import { NextResponse } from "next/server";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import { getMockHourMixReport } from "@/lib/mock/time-tracking-store";
import {
  HourMixData,
  HourMixReportData,
  HourMixReportEmployeeRow,
  HourMixReportStoreRow,
  TimeEntryStatus,
} from "@/lib/types/domain";

function mapStatus(status: string): TimeEntryStatus {
  if (status === "on_break") return "on_break";
  if (status === "clocked_out") return "clocked_out";
  if (status === "flagged") return "flagged";
  return "clocked_in";
}

export async function GET() {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (access.kind === "mock") {
      return NextResponse.json({ data: getMockHourMixReport() });
    }

    const supabase = access.supabase;

    const { data: rows, error } = await supabase
      .from("active_time_entries_view")
      .select("employee_id, employee_name, employee_code, store_id, store_name, status, regular_hours, ot_hours, dt_hours")
      .order("employee_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byEmployee: HourMixReportEmployeeRow[] = (rows ?? []).map((row) => {
      const regularHours = Number(row.regular_hours ?? 0);
      const otHours = Number(row.ot_hours ?? 0);
      const dtHours = Number(row.dt_hours ?? 0);
      return {
        employeeId: row.employee_id,
        employeeCode: row.employee_code ?? "N/A",
        employeeName: row.employee_name,
        storeId: row.store_id,
        storeName: row.store_name,
        status: mapStatus(row.status),
        regularHours: Math.round(regularHours * 100) / 100,
        otHours: Math.round(otHours * 100) / 100,
        dtHours: Math.round(dtHours * 100) / 100,
        totalHours: Math.round((regularHours + otHours + dtHours) * 100) / 100,
      };
    });

    const regular = byEmployee.reduce((sum, r) => sum + r.regularHours, 0);
    const ot = byEmployee.reduce((sum, r) => sum + r.otHours, 0);
    const dt = byEmployee.reduce((sum, r) => sum + r.dtHours, 0);
    const summary: HourMixData = {
      totalHours: Math.round((regular + ot + dt) * 100) / 100,
      segments: [
        { name: "Regular", value: Math.round(regular * 100) / 100 },
        { name: "OT", value: Math.round(ot * 100) / 100 },
        { name: "DT", value: Math.round(dt * 100) / 100 },
      ],
    };

    const storeMap = new Map<string, HourMixReportStoreRow>();
    for (const r of byEmployee) {
      const existing = storeMap.get(r.storeId) ?? {
        storeId: r.storeId,
        storeName: r.storeName,
        regularHours: 0,
        otHours: 0,
        dtHours: 0,
        totalHours: 0,
        activeShiftCount: 0,
      };
      existing.regularHours += r.regularHours;
      existing.otHours += r.otHours;
      existing.dtHours += r.dtHours;
      existing.activeShiftCount += 1;
      storeMap.set(r.storeId, existing);
    }

    const byStore = Array.from(storeMap.values())
      .map((row) => {
        const regularHours = Math.round(row.regularHours * 100) / 100;
        const otHours = Math.round(row.otHours * 100) / 100;
        const dtHours = Math.round(row.dtHours * 100) / 100;
        return {
          ...row,
          regularHours,
          otHours,
          dtHours,
          totalHours: Math.round((regularHours + otHours + dtHours) * 100) / 100,
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    const payload: HourMixReportData = {
      summary,
      generatedAt: new Date().toISOString(),
      scopeDescription:
        "These totals are for open shifts only (people not clocked out yet). For finished shifts ready for payroll, use Timesheets.",
      byEmployee,
      byStore,
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
