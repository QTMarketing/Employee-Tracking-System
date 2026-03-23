import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockHourMix } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HourMixData } from "@/lib/types/domain";

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: getMockHourMix() });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from("time_entries")
      .select("regular_hours, ot_hours, dt_hours")
      .is("clock_out_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const regular = (rows ?? []).reduce((sum, row) => sum + Number(row.regular_hours ?? 0), 0);
    const ot = (rows ?? []).reduce((sum, row) => sum + Number(row.ot_hours ?? 0), 0);
    const dt = (rows ?? []).reduce((sum, row) => sum + Number(row.dt_hours ?? 0), 0);

    const payload: HourMixData = {
      totalHours: Math.round((regular + ot + dt) * 100) / 100,
      segments: [
        { name: "Regular", value: Math.round(regular * 100) / 100 },
        { name: "OT", value: Math.round(ot * 100) / 100 },
        { name: "DT", value: Math.round(dt * 100) / 100 },
      ],
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
