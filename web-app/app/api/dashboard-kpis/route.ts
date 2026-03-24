import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { resolveApiDataAccess } from "@/lib/api-data-access";
import { getMockKpis } from "@/lib/mock/time-tracking-store";
import { DashboardKpiItem } from "@/lib/types/domain";

function toStringMetric(value: number) {
  return Intl.NumberFormat("en-US").format(Math.round(value * 100) / 100);
}

/** Same default window as Timesheets (`timesheets-view.tsx`): last 14 UTC days by `clock_in_at`. */
function payrollPendingWindowStart(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 14);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function resolvePayrollPendingPreview(
  supabase: SupabaseClient,
  since: Date,
): Promise<string | undefined> {
  const { data } = await supabase
    .from("time_entries")
    .select("employee_id, store_id")
    .not("clock_out_at", "is", null)
    .is("payroll_approved_at", null)
    .gte("clock_in_at", since.toISOString())
    .order("clock_in_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.employee_id) return undefined;
  const [{ data: user }, { data: store }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", data.employee_id).maybeSingle(),
    supabase.from("stores").select("name").eq("id", data.store_id).maybeSingle(),
  ]);
  const en = user?.full_name ?? "Employee";
  const sn = store?.name ?? "Store";
  return `${en} · ${sn} · earliest unapproved in range`;
}

async function resolveFlaggedPreview(supabase: SupabaseClient): Promise<string | undefined> {
  const { data } = await supabase
    .from("time_entries")
    .select("employee_id, store_id")
    .eq("status", "flagged")
    .order("clock_in_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.employee_id) return undefined;
  const [{ data: user }, { data: store }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", data.employee_id).maybeSingle(),
    supabase.from("stores").select("name").eq("id", data.store_id).maybeSingle(),
  ]);
  const en = user?.full_name ?? "Employee";
  const sn = store?.name ?? "Store";
  return `${en} · ${sn} · oldest flagged shift`;
}

function rollingSevenDayStartUtc(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function resolveProfileGapsSummary(
  supabase: SupabaseClient,
): Promise<{ count: number; preview?: string }> {
  const [{ data: employees, error: empError }, { data: assignments, error: assignError }, { data: profiles, error: profError }] =
    await Promise.all([
      supabase.from("users").select("id, full_name").eq("role", "employee").eq("status", "active"),
      supabase.from("user_store_assignments").select("user_id"),
      supabase.from("employee_profiles").select("user_id, hourly_rate"),
    ]);

  if (empError || assignError || profError) {
    return { count: 0 };
  }

  const assigned = new Set((assignments ?? []).map((a) => a.user_id));
  const profileByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.hourly_rate as number | string | null]),
  );

  const gaps: { id: string; full_name: string }[] = [];
  for (const row of employees ?? []) {
    const hasStore = assigned.has(row.id);
    const rate = profileByUser.get(row.id);
    const hasRate = rate !== undefined && rate !== null && String(rate).trim() !== "";
    if (!hasStore || !hasRate) {
      gaps.push({ id: row.id, full_name: row.full_name });
    }
  }

  const preview =
    gaps[0] !== undefined
      ? `${gaps[0].full_name}${gaps.length > 1 ? ` · +${gaps.length - 1} more` : ""} · missing store or pay rate`
      : undefined;

  return { count: gaps.length, preview };
}

async function resolveOvertime7dSummary(
  supabase: SupabaseClient,
  since: Date,
): Promise<{ totalOt: number; shiftsWithOt: number }> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("ot_hours")
    .gte("clock_in_at", since.toISOString());

  if (error || !data) {
    return { totalOt: 0, shiftsWithOt: 0 };
  }

  let totalOt = 0;
  let shiftsWithOt = 0;
  for (const row of data) {
    const ot = Number(row.ot_hours ?? 0);
    if (!Number.isFinite(ot)) continue;
    totalOt += ot;
    if (ot > 0) shiftsWithOt += 1;
  }
  return { totalOt, shiftsWithOt };
}

export async function GET() {
  try {
    const access = await resolveApiDataAccess();
    if (access.kind === "unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (access.kind === "mock") {
      return NextResponse.json({ data: getMockKpis() });
    }

    const supabase = access.supabase;

    const [{ count: activeCount, error: activeError }, { count: flaggedCount, error: flaggedError }] =
      await Promise.all([
        supabase
          .from("time_entries")
          .select("*", { count: "exact", head: true })
          .in("status", ["clocked_in", "on_break"])
          .is("clock_out_at", null),
        supabase.from("time_entries").select("*", { count: "exact", head: true }).eq("status", "flagged"),
      ]);

    if (activeError || flaggedError) {
      return NextResponse.json({ error: activeError?.message ?? flaggedError?.message }, { status: 500 });
    }

    const { data: totalRows, error: totalHoursError } = await supabase
      .from("time_entries")
      .select("regular_hours, ot_hours, dt_hours")
      .gte("clock_in_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());

    if (totalHoursError) {
      return NextResponse.json({ error: totalHoursError.message }, { status: 500 });
    }

    const payrollSince = payrollPendingWindowStart();
    const { count: pendingPayrollCount, error: pendingPayrollError } = await supabase
      .from("time_entries")
      .select("*", { count: "exact", head: true })
      .not("clock_out_at", "is", null)
      .is("payroll_approved_at", null)
      .gte("clock_in_at", payrollSince.toISOString());

    if (pendingPayrollError) {
      return NextResponse.json({ error: pendingPayrollError.message }, { status: 500 });
    }

    const totalHours = (totalRows ?? []).reduce(
      (sum, row) => sum + Number(row.regular_hours ?? 0) + Number(row.ot_hours ?? 0) + Number(row.dt_hours ?? 0),
      0,
    );

    const payrollPendingN = pendingPayrollCount ?? 0;
    const flaggedN = flaggedCount ?? 0;
    const otSince = rollingSevenDayStartUtc();
    const [payrollPreview, flaggedPreview, profileGaps, activeStoresResult, otSummary] = await Promise.all([
      payrollPendingN > 0 ? resolvePayrollPendingPreview(supabase, payrollSince) : Promise.resolve(undefined),
      flaggedN > 0 ? resolveFlaggedPreview(supabase) : Promise.resolve(undefined),
      resolveProfileGapsSummary(supabase),
      supabase.from("stores").select("*", { count: "exact", head: true }).eq("is_active", true),
      resolveOvertime7dSummary(supabase, otSince),
    ]);

    const activeStores = activeStoresResult.count ?? 0;
    const profileGapN = profileGaps.count;
    const ot7d = otSummary.totalOt;
    const otShifts = otSummary.shiftsWithOt;
    const otPreview =
      ot7d > 0
        ? `${toStringMetric(ot7d)}h OT · ${otShifts} shift${otShifts === 1 ? "" : "s"} in last 7 days`
        : undefined;

    const kpis: DashboardKpiItem[] = [
      {
        key: "pending_approvals",
        label: "Pending payroll approval",
        value: String(payrollPendingN),
        change: "Closed shifts from the last 14 days not yet marked approved on Timesheets",
        tone: "warning",
        preview: payrollPreview,
        ctaHref: "/timesheets",
        ctaLabel: "Open timesheets",
      },
      {
        key: "flagged_short_entries",
        label: "Flagged entries",
        value: String(flaggedCount ?? 0),
        change: "Needs a closer look",
        tone: "danger",
        preview: flaggedPreview,
        ctaHref: "/time-clock",
        ctaLabel: "Open time clock",
      },
      {
        key: "clocked_in",
        label: "Currently clocked in",
        value: String(activeCount ?? 0),
        change: "Clocked in or on break right now",
        tone: "primary",
        ctaHref: "/time-clock",
        ctaLabel: "Open time clock",
      },
      {
        key: "total_hours_today",
        label: "Total hours today",
        value: toStringMetric(totalHours),
        change: "Clocked in today (UTC day); includes people who already clocked out",
        tone: "success",
        ctaHref: "/timesheets",
        ctaLabel: "Open timesheets",
      },
      {
        key: "profile_gaps",
        label: "Profile gaps",
        value: String(profileGapN),
        change: "Active employees missing a store assignment or hourly rate in their profile",
        tone: profileGapN > 0 ? "warning" : "success",
        preview: profileGaps.preview,
        ctaHref: "/employees",
        ctaLabel: "Open employees",
      },
      {
        key: "active_stores",
        label: "Active locations",
        value: String(activeStores),
        change: "Stores available for assignments and time rules",
        tone: "primary",
        ctaHref: "/settings",
        ctaLabel: "Time rules",
      },
      {
        key: "overtime_hours_7d",
        label: "OT hours (7d)",
        value: toStringMetric(ot7d),
        change: "Overtime hours recorded on shifts clocked in during the last 7 UTC days",
        tone: ot7d > 0 ? "accent" : "success",
        preview: otPreview,
        ctaHref: "/reports?focus=labor",
        ctaLabel: "Labor report",
      },
    ];

    return NextResponse.json({ data: kpis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
