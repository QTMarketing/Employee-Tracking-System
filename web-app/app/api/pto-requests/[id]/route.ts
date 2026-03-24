import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import { getMockPtoRequests, patchMockPtoRequest } from "@/lib/mock/time-tracking-store";
import type { PtoRequestRow, PtoRequestStatus } from "@/lib/types/domain";

const patchSchema = z.object({
  status: z.enum(["approved", "denied", "cancelled"]),
  managerNote: z.string().max(500).optional().nullable(),
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
    requestType: r.request_type as PtoRequestRow["requestType"],
    startDate: r.start_date,
    endDate: r.end_date,
    note: r.note,
    status: r.status as PtoRequestStatus,
    reviewedById: r.reviewed_by,
    reviewedByName: names.reviewerName,
    reviewedAt: r.reviewed_at,
    managerNote: r.manager_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = patchSchema.parse(await request.json());

    if (access.kind === "mock") {
      const list = getMockPtoRequests();
      const cur = list.find((r) => r.id === id);
      if (!cur) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (body.status === "cancelled") {
        if (cur.status !== "pending") {
          return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
        }
        patchMockPtoRequest(id, {
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        });
      } else {
        patchMockPtoRequest(id, {
          status: body.status,
          managerNote: body.managerNote ?? null,
          reviewedById: "00000000-0000-4000-8000-000000000001",
          reviewedByName: "Dev Admin",
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      const next = getMockPtoRequests().find((r) => r.id === id)!;
      return NextResponse.json({ data: next });
    }

    const supabase = access.supabase;
    const userId = access.userId;

    const { data: existing, error: fetchErr } = await supabase
      .from("pto_requests")
      .select(
        "id, employee_id, store_id, request_type, start_date, end_date, note, status, reviewed_by, reviewed_at, manager_note, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: fetchErr?.message ?? "Not found" }, { status: 404 });
    }

    const { data: me } = await supabase.from("users").select("role").eq("id", userId).single();
    const role = me?.role;

    if (body.status === "cancelled") {
      if (role !== "employee" || existing.employee_id !== userId) {
        return NextResponse.json({ error: "Only the employee can cancel their own request" }, { status: 403 });
      }
      if (existing.status !== "pending") {
        return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
      }
    } else if (role === "employee") {
      return NextResponse.json({ error: "Employees cannot approve or deny" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const update =
      body.status === "cancelled"
        ? {
            status: "cancelled" as const,
            updated_at: now,
          }
        : {
            status: body.status,
            manager_note: body.managerNote ?? null,
            reviewed_by: userId,
            reviewed_at: now,
            updated_at: now,
          };

    const { data: updated, error: upErr } = await supabase
      .from("pto_requests")
      .update(update)
      .eq("id", id)
      .select(
        "id, employee_id, store_id, request_type, start_date, end_date, note, status, reviewed_by, reviewed_at, manager_note, created_at, updated_at",
      )
      .single();

    if (upErr || !updated) {
      return NextResponse.json({ error: upErr?.message ?? "Update failed" }, { status: 400 });
    }

    const [{ data: u }, { data: s }, { data: p }, { data: rev }] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", updated.employee_id).single(),
      supabase.from("stores").select("name").eq("id", updated.store_id).single(),
      supabase.from("employee_profiles").select("employee_code").eq("user_id", updated.employee_id).maybeSingle(),
      updated.reviewed_by
        ? supabase.from("users").select("full_name").eq("id", updated.reviewed_by).single()
        : Promise.resolve({ data: null as { full_name: string } | null }),
    ]);

    const row = mapPtoRow(updated, {
      employeeName: u?.full_name ?? "Employee",
      employeeCode: p?.employee_code ?? "—",
      storeName: s?.name ?? "Store",
      reviewerName: rev?.full_name ?? null,
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
