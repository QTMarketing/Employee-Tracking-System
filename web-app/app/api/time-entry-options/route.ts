import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/data-mode";
import { getMockTimeEntryOptions } from "@/lib/mock/time-tracking-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EntryOption, TimeEntryOptions } from "@/lib/types/domain";

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({ data: getMockTimeEntryOptions() });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !roleRow) {
      return NextResponse.json({ error: "Unable to resolve user role" }, { status: 403 });
    }

    const isAdmin = roleRow.role === "admin";

    let stores: EntryOption[] = [];
    if (isAdmin) {
      const { data, error } = await supabase.from("stores").select("id, name").eq("is_active", true).order("name");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      stores = (data ?? []).map((store) => ({ id: store.id, label: store.name }));
    } else {
      const { data: assignmentRows, error } = await supabase
        .from("user_store_assignments")
        .select("store_id")
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const storeIds = Array.from(new Set((assignmentRows ?? []).map((row) => row.store_id)));
      if (storeIds.length > 0) {
        const { data: storeRows, error: storeError } = await supabase
          .from("stores")
          .select("id, name")
          .in("id", storeIds)
          .eq("is_active", true);

        if (storeError) {
          return NextResponse.json({ error: storeError.message }, { status: 500 });
        }

        stores = (storeRows ?? []).map((store) => ({ id: store.id, label: store.name }));
      }
    }

    const storeIds = Array.from(new Set(stores.map((store) => store.id)));
    if (storeIds.length === 0) {
      const empty: TimeEntryOptions = { employees: [], stores: [] };
      return NextResponse.json({ data: empty });
    }

    const { data: assignmentRows, error: assignmentError } = await supabase
      .from("user_store_assignments")
      .select("user_id")
      .in("store_id", storeIds);

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const employeeIds = Array.from(new Set((assignmentRows ?? []).map((row) => row.user_id)));

    const { data: employees, error: employeesError } = await supabase
      .from("users")
      .select("id, full_name, role")
      .in("id", employeeIds)
      .eq("role", "employee")
      .eq("status", "active")
      .order("full_name");

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 500 });
    }

    const employeeOptions: EntryOption[] = (employees ?? []).map((employee) => ({
      id: employee.id,
      label: employee.full_name,
    }));

    const payload: TimeEntryOptions = {
      employees: employeeOptions,
      stores: stores.sort((a, b) => a.label.localeCompare(b.label)),
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
