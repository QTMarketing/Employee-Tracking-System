import { NextResponse } from "next/server";
import { z } from "zod";

import { isMockMode } from "@/lib/data-mode";
import { applyMockClockEvent } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const clockEventSchema = z.object({
  employeeId: z.uuid(),
  storeId: z.uuid(),
  action: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  notes: z.string().max(240).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = clockEventSchema.parse(body);

    if (isMockMode()) {
      const result = applyMockClockEvent(input);
      return NextResponse.json(result);
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc(
      "apply_clock_event",
      {
        p_employee_id: input.employeeId,
        p_store_id: input.storeId,
        p_event_type: input.action,
        p_method: "admin_manual",
        p_reason: "MANUAL_ENTRY",
        p_note: input.notes ?? null,
      } as never,
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ eventId: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    if (error instanceof Error && (error.message.startsWith("Cannot") || error.message.includes("active shift"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
