import { NextResponse } from "next/server";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import { deleteMockScheduledShift, getMockScheduledShifts } from "@/lib/mock/time-tracking-store";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (access.kind === "mock") {
      const exists = getMockScheduledShifts().some((r) => r.id === id);
      if (!exists) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      deleteMockScheduledShift(id);
      return NextResponse.json({ ok: true });
    }

    const supabase = access.supabase;
    const { error } = await supabase.from("scheduled_shifts").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
