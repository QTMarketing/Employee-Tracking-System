import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import {
  appendMockPtoRequest,
  getMockEmployeeRoster,
  getMockPtoRequests,
  getMockTimeEntryOptions,
} from "@/lib/mock/time-tracking-store";
import type { PtoRequestRow, PtoRequestType } from "@/lib/types/domain";

const createSchema = z.object({
  storeId: z.uuid(),
  employeeId: z.uuid().optional(),
  requestType: z.enum(["vacation", "sick", "personal"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

function mapPtoRow(
  r: {
    id: string;
    employee_id: string;
    store_id: string;
    request_type: string;
    start_date: string;
    end_date: string;
    note: string | null;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    manager_note: string | null;
    created_at: string;
    updated_at: string;
  },
  names: {
    employeeName: string;
    employeeCode: string;
    storeName: string;
    reviewerName: string | null;
  },
): PtoRequestRow {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: names.employeeName,
    employeeCode: names.employeeCode,
    storeId: r.store_id,
    storeName: names.storeName,
    requestType: r.request_type as PtoRequestType,
    startDate: r.start_date,
    endDate: r.end_date,
    note: r.note,
    status: r.status as PtoRequestRow["status"],
    reviewedById: r.reviewed_by,
    reviewedByName: names.reviewerName,
    reviewedAt: r.reviewed_at,
    managerNote: r.manager_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET() {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (access.kind === "mock") {
      return NextResponse.json({ data: getMockPtoRequests() });
    }

    const supabase = access.supabase;
    const { data: rows, error } = await supabase
      .from("pto_requests")
      .select(
        "id, employee_id, store_id, request_type, start_date, end_date, note, status, reviewed_by, reviewed_at, manager_note, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = rows ?? [];
    const empIds = Array.from(new Set(list.map((x) => x.employee_id)));
    const stIds = Array.from(new Set(list.map((x) => x.store_id)));
    const revIds = Array.from(
      new Set(list.map((x) => x.reviewed_by).filter((id): id is string => typeof id === "string" && id.length > 0)),
    );

    const [usersRes, storesRes, revRes] = await Promise.all([
      empIds.length
        ? supabase.from("users").select("id, full_name").in("id", empIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      stIds.length ? supabase.from("stores").select("id, name").in("id", stIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      revIds.length
        ? supabase.from("users").select("id, full_name").in("id", revIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

    const profilesRes =
      empIds.length > 0
        ? await supabase.from("employee_profiles").select("user_id, employee_code").in("user_id", empIds)
        : { data: [] as { user_id: string; employee_code: string }[] };

    const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
    const storeMap = new Map((storesRes.data ?? []).map((s) => [s.id, s.name]));
    const revMap = new Map((revRes.data ?? []).map((u) => [u.id, u.full_name]));
    const codeMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p.employee_code]));

    const data: PtoRequestRow[] = list.map((r) =>
      mapPtoRow(r, {
        employeeName: userMap.get(r.employee_id) ?? "Employee",
        employeeCode: codeMap.get(r.employee_id) ?? "—",
        storeName: storeMap.get(r.store_id) ?? "Store",
        reviewerName: r.reviewed_by ? (revMap.get(r.reviewed_by) ?? null) : null,
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
    if (body.endDate < body.startDate) {
      return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
    }

    if (access.kind === "mock") {
      const opts = getMockTimeEntryOptions();
      const employeeId = body.employeeId ?? "11111111-1111-4111-8111-111111111111";
      const empLabel = opts.employees.find((e) => e.id === employeeId)?.label ?? "Employee";
      const store = opts.stores.find((s) => s.id === body.storeId);
      if (!store) {
        return NextResponse.json({ error: "Unknown store" }, { status: 400 });
      }
      let code = "—";
      for (const g of getMockEmployeeRoster().byStore) {
        const row = g.employees.find((e) => e.id === employeeId);
        if (row?.employeeCode) {
          code = row.employeeCode;
          break;
        }
      }
      const id = `pto-mock-${Date.now()}`;
      const ts = new Date().toISOString();
      const row: PtoRequestRow = {
        id,
        employeeId,
        employeeName: empLabel,
        employeeCode: code === "—" ? "MOCK" : code,
        storeId: body.storeId,
        storeName: store.label,
        requestType: body.requestType,
        startDate: body.startDate,
        endDate: body.endDate,
        note: body.note ?? null,
        status: "pending",
        reviewedById: null,
        reviewedByName: null,
        reviewedAt: null,
        managerNote: null,
        createdAt: ts,
        updatedAt: ts,
      };
      appendMockPtoRequest(row);
      return NextResponse.json({ data: row });
    }

    const supabase = access.supabase;
    const userId = access.userId;

    const { data: me, error: meErr } = await supabase.from("users").select("role").eq("id", userId).single();
    if (meErr || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const targetEmployeeId =
      me.role === "employee" ? userId : (body.employeeId ?? userId);

    if (me.role === "employee" && body.employeeId && body.employeeId !== userId) {
      return NextResponse.json({ error: "You can only request PTO for yourself" }, { status: 403 });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("pto_requests")
      .insert({
        employee_id: targetEmployeeId,
        store_id: body.storeId,
        request_type: body.requestType,
        start_date: body.startDate,
        end_date: body.endDate,
        note: body.note ?? null,
      })
      .select(
        "id, employee_id, store_id, request_type, start_date, end_date, note, status, reviewed_by, reviewed_at, manager_note, created_at, updated_at",
      )
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 400 });
    }

    const [{ data: u }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", inserted.employee_id).single(),
      supabase.from("stores").select("name").eq("id", inserted.store_id).single(),
      supabase.from("employee_profiles").select("employee_code").eq("user_id", inserted.employee_id).maybeSingle(),
    ]);

    const row = mapPtoRow(inserted, {
      employeeName: u?.full_name ?? "Employee",
      employeeCode: p?.employee_code ?? "—",
      storeName: s?.name ?? "Store",
      reviewerName: null,
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
