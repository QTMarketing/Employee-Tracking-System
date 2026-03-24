import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import {
  appendMockScheduledShift,
  getMockEmployeeRoster,
  getMockScheduledShifts,
  getMockTimeEntryOptions,
} from "@/lib/mock/time-tracking-store";
import type { ScheduledShiftRow, ShiftTemplate } from "@/lib/types/domain";

const createSchema = z.object({
  storeId: z.uuid(),
  employeeId: z.uuid(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  shiftTemplate: z.enum(["morning", "evening", "overnight", "custom"]).default("custom"),
  roleLabel: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function mapShiftRow(
  r: {
    id: string;
    store_id: string;
    employee_id: string;
    start_at: string;
    end_at: string;
    shift_template: string;
    role_label: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  },
  names: { storeName: string; employeeName: string; employeeCode: string },
): ScheduledShiftRow {
  return {
    id: r.id,
    storeId: r.store_id,
    storeName: names.storeName,
    employeeId: r.employee_id,
    employeeName: names.employeeName,
    employeeCode: names.employeeCode,
    startAt: r.start_at,
    endAt: r.end_at,
    shiftTemplate: r.shift_template as ShiftTemplate,
    roleLabel: r.role_label,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const filters = { storeId, from, to };

    if (access.kind === "mock") {
      return NextResponse.json({ data: getMockScheduledShifts(filters) });
    }

    const supabase = access.supabase;
    let query = supabase
      .from("scheduled_shifts")
      .select("id, store_id, employee_id, start_at, end_at, shift_template, role_label, notes, created_at, updated_at")
      .order("start_at", { ascending: true })
      .limit(500);

    if (storeId) {
      query = query.eq("store_id", storeId);
    }
    if (from) {
      const rangeStart = new Date(`${from}T00:00:00.000Z`).toISOString();
      query = query.gt("end_at", rangeStart);
    }
    if (to) {
      const end = new Date(`${to}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      query = query.lt("start_at", end.toISOString());
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = rows ?? [];
    const empIds = Array.from(new Set(list.map((x) => x.employee_id)));
    const stIds = Array.from(new Set(list.map((x) => x.store_id)));

    const [usersRes, storesRes, profilesRes] = await Promise.all([
      empIds.length ? supabase.from("users").select("id, full_name").in("id", empIds) : { data: [] as { id: string; full_name: string }[] },
      stIds.length ? supabase.from("stores").select("id, name").in("id", stIds) : { data: [] as { id: string; name: string }[] },
      empIds.length
        ? supabase.from("employee_profiles").select("user_id, employee_code").in("user_id", empIds)
        : { data: [] as { user_id: string; employee_code: string }[] },
    ]);

    const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
    const storeMap = new Map((storesRes.data ?? []).map((s) => [s.id, s.name]));
    const codeMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p.employee_code]));

    const data: ScheduledShiftRow[] = list.map((r) =>
      mapShiftRow(r, {
        storeName: storeMap.get(r.store_id) ?? "Store",
        employeeName: userMap.get(r.employee_id) ?? "Employee",
        employeeCode: codeMap.get(r.employee_id) ?? "—",
      }),
    );

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = createSchema.parse(await request.json());
    const start = new Date(body.startAt);
    const end = new Date(body.endAt);
    if (!(end > start)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    if (access.kind === "mock") {
      const opts = getMockTimeEntryOptions();
      const st = opts.stores.find((s) => s.id === body.storeId);
      const emp = opts.employees.find((e) => e.id === body.employeeId);
      if (!st || !emp) {
        return NextResponse.json({ error: "Invalid store or employee" }, { status: 400 });
      }
      let code = "MOCK";
      for (const g of getMockEmployeeRoster().byStore) {
        const row = g.employees.find((e) => e.id === body.employeeId);
        if (row?.employeeCode) {
          code = row.employeeCode;
          break;
        }
      }
      const ts = new Date().toISOString();
      const id = `sch-mock-${Date.now()}`;
      const row: ScheduledShiftRow = {
        id,
        storeId: body.storeId,
        storeName: st.label,
        employeeId: body.employeeId,
        employeeName: emp.label,
        employeeCode: code,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        shiftTemplate: body.shiftTemplate,
        roleLabel: body.roleLabel ?? null,
        notes: body.notes ?? null,
        createdAt: ts,
        updatedAt: ts,
      };
      appendMockScheduledShift(row);
      return NextResponse.json({ data: row });
    }

    const supabase = access.supabase;
    const userId = access.userId;

    const { data: inserted, error: insErr } = await supabase
      .from("scheduled_shifts")
      .insert({
        store_id: body.storeId,
        employee_id: body.employeeId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        shift_template: body.shiftTemplate,
        role_label: body.roleLabel ?? null,
        notes: body.notes ?? null,
        created_by: userId,
      })
      .select("id, store_id, employee_id, start_at, end_at, shift_template, role_label, notes, created_at, updated_at")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 400 });
    }

    const [{ data: u }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", inserted.employee_id).single(),
      supabase.from("stores").select("name").eq("id", inserted.store_id).single(),
      supabase.from("employee_profiles").select("employee_code").eq("user_id", inserted.employee_id).maybeSingle(),
    ]);

    const row = mapShiftRow(inserted, {
      storeName: s?.name ?? "Store",
      employeeName: u?.full_name ?? "Employee",
      employeeCode: p?.employee_code ?? "—",
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
