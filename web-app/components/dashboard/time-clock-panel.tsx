"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchEmployeeRoster } from "@/lib/api/employees";
import { createClockEvent, fetchTimeEntries, fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { isActiveShiftAlert } from "@/lib/shift-attention";
import type { ActiveTimeEntry, CreateClockEventInput } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function statusLabel(status: ActiveTimeEntry["status"]): string {
  if (status === "clocked_in") return "Clocked in";
  if (status === "on_break") return "On break";
  if (status === "flagged") return "Flagged";
  return "Clocked out";
}

function statusTone(status: ActiveTimeEntry["status"]): "alert" | "success" | "neutral" {
  if (isActiveShiftAlert(status)) return "alert";
  if (status === "clocked_in") return "success";
  return "neutral";
}

async function invalidateAfterClockEvent(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries }),
    queryClient.invalidateQueries({ queryKey: queryKeys.activityFeed }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardKpis }),
    queryClient.invalidateQueries({ queryKey: queryKeys.hourMix }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCharts }),
  ]);
}

export function TimeClockPanel() {
  const queryClient = useQueryClient();
  const [focusStoreId, setFocusStoreId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: options, isLoading: optionsLoading, isError: optionsError } = useQuery({
    queryKey: queryKeys.timeEntryOptions,
    queryFn: fetchTimeEntryOptions,
  });

  const { data: roster, isLoading: rosterLoading, isError: rosterError } = useQuery({
    queryKey: queryKeys.employeeRoster,
    queryFn: fetchEmployeeRoster,
  });

  const { data: entries = [], isLoading: entriesLoading, isError: entriesError } = useQuery({
    queryKey: queryKeys.timeEntries,
    queryFn: fetchTimeEntries,
  });

  const openShift = useMemo(
    () => (employeeId ? entries.find((row) => row.employeeId === employeeId) : undefined),
    [entries, employeeId],
  );

  function setEmployeeSelection(nextId: string) {
    setEmployeeId(nextId);
    if (!nextId) {
      setStoreId("");
      return;
    }
    const shift = entries.find((row) => row.employeeId === nextId);
    if (!shift) {
      if (focusStoreId) {
        setStoreId(focusStoreId);
      } else if (options?.stores?.length === 1) {
        setStoreId(options.stores[0]!.id);
      } else {
        setStoreId("");
      }
    }
  }

  function onFocusStoreChange(nextFocus: string) {
    setFocusStoreId(nextFocus);
    setEmployeeId("");
    setNotes("");
    if (nextFocus) {
      setStoreId(nextFocus);
    } else if (options?.stores?.length === 1) {
      setStoreId(options.stores[0]!.id);
    } else {
      setStoreId("");
    }
  }

  const entriesFiltered = useMemo(() => {
    if (!focusStoreId) {
      return entries;
    }
    return entries.filter((row) => row.storeId === focusStoreId);
  }, [entries, focusStoreId]);

  const shiftsByStore = useMemo(() => {
    const map = new Map<string, { storeName: string; rows: ActiveTimeEntry[] }>();
    for (const row of entriesFiltered) {
      const bucket = map.get(row.storeId) ?? { storeName: row.storeName, rows: [] };
      bucket.rows.push(row);
      map.set(row.storeId, bucket);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].storeName.localeCompare(b[1].storeName))
      .map(([id, value]) => ({ storeId: id, ...value }));
  }, [entriesFiltered]);

  const rosterGroups = useMemo(() => {
    const byStore = roster?.byStore;
    if (!byStore?.length) {
      return [];
    }
    if (!focusStoreId) {
      return byStore;
    }
    return byStore.filter((group) => group.storeId === focusStoreId);
  }, [roster, focusStoreId]);

  const mutation = useMutation({
    mutationFn: (input: CreateClockEventInput) => createClockEvent(input),
    onSuccess: async (_, variables) => {
      const name =
        rosterGroups.flatMap((g) => g.employees).find((e) => e.id === variables.employeeId)?.fullName ??
        options?.employees.find((e) => e.id === variables.employeeId)?.label ??
        "Employee";
      toast.success(`Recorded ${variables.action.replace("_", " ")} for ${name}`);
      setNotes("");
      await invalidateAfterClockEvent(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canClockIn = Boolean(employeeId && storeId && !openShift);
  const canClockOut = Boolean(openShift && openShift.status !== "clocked_out");
  const canBreakStart = Boolean(openShift && openShift.status !== "on_break");
  const canBreakEnd = Boolean(openShift && openShift.status === "on_break");

  const submit = (action: CreateClockEventInput["action"]) => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    const resolvedStore = openShift?.storeId ?? storeId;
    if (!resolvedStore) {
      toast.error("Select a location");
      return;
    }
    const payload: CreateClockEventInput = {
      employeeId,
      storeId: resolvedStore,
      action,
      notes: notes.trim() || undefined,
    };
    mutation.mutate(payload);
  };

  const floorCount = useMemo(
    () => entriesFiltered.filter((e) => e.status === "clocked_in" || e.status === "on_break").length,
    [entriesFiltered],
  );

  if (optionsError || entriesError || rosterError) {
    return (
      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        Could not load the time clock. Check your connection, sign in again, or ask your administrator if this keeps
        happening.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <SectionHeader
              as="h2"
              title="Open shifts"
              description="Who is clocked in or on break, grouped by location."
            />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{floorCount}</span> people clocked in or on break
              in this view. Flagged rows stay here until you fix them.
            </p>
          </div>
          <div className="w-full min-w-[10rem] shrink-0 sm:max-w-[220px]">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="tc-focus-store">
              Show
            </label>
            <select
              id="tc-focus-store"
              value={focusStoreId}
              onChange={(e) => onFocusStoreChange(e.target.value)}
              disabled={optionsLoading}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">All stores</option>
              {(options?.stores ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={cn("mt-4 max-h-[min(520px,65vh)]", dataTable.shell)}>
          {entriesLoading ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading shifts…</div>
          ) : entriesFiltered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
              {focusStoreId ? "No open shifts for this store." : "No open shifts."}
            </div>
          ) : (
            <table className={`${dataTable.table} min-w-[320px]`}>
              <thead className={cn(dataTable.thead, "sticky top-0 z-[1]")}>
                <tr>
                  <th className={dataTable.th}>Employee</th>
                  {!focusStoreId ? <th className={dataTable.th}>Store</th> : null}
                  <th className={dataTable.th}>Status</th>
                </tr>
              </thead>
              <tbody className={dataTable.tbody}>
                {shiftsByStore.map((section) => (
                  <Fragment key={section.storeId}>
                    {!focusStoreId ? (
                      <tr className="bg-[color-mix(in_oklab,var(--sidebar-ink)_6%,var(--surface-soft))]">
                        <td
                          colSpan={3}
                          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
                        >
                          {section.storeName}{" "}
                          <span className="font-normal text-[var(--text-muted)]">({section.rows.length})</span>
                        </td>
                      </tr>
                    ) : null}
                    {section.rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          row.employeeId === employeeId
                            ? "bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))]"
                            : isActiveShiftAlert(row.status)
                              ? "bg-amber-100 ring-1 ring-inset ring-amber-300/80"
                              : undefined,
                        )}
                      >
                        <td className={`${dataTable.td} font-medium`}>
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() => setEmployeeSelection(row.employeeId)}
                          >
                            {row.employeeName}
                          </button>
                          <div className="text-xs font-normal text-[var(--text-muted)]">{row.employeeCode}</div>
                        </td>
                        {!focusStoreId ? <td className={dataTable.tdMuted}>{row.storeName}</td> : null}
                        <td className={dataTable.td}>
                          <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          as="h2"
          title="Record time"
          description="Clock in, start or end a break, or clock out for the person you select."
        />

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="tc-employee">
              Employee {focusStoreId ? "(only the location chosen above)" : "(grouped by location)"}
            </label>
            <select
              id="tc-employee"
              value={employeeId}
              onChange={(e) => setEmployeeSelection(e.target.value)}
              disabled={optionsLoading || rosterLoading}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">{rosterLoading ? "Loading…" : "Select employee"}</option>
              {rosterGroups.length > 0
                ? rosterGroups.map((group) => (
                    <optgroup key={group.storeId} label={group.storeName}>
                      {group.employees.map((employee) => (
                        <option key={`${group.storeId}-${employee.id}`} value={employee.id}>
                          {employee.fullName}
                          {employee.employeeCode ? ` (${employee.employeeCode})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : (options?.employees ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="tc-store">
              Location {openShift ? "(from their open shift)" : ""}
            </label>
            <select
              id="tc-store"
              value={openShift?.storeId ?? storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={optionsLoading || Boolean(openShift)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">{optionsLoading ? "Loading…" : "Select location"}</option>
              {(options?.stores ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.label}
                </option>
              ))}
            </select>
          </div>

          {openShift ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Current shift: <span className="font-medium text-[var(--text-primary)]">{openShift.storeName}</span> —{" "}
              <Badge tone={statusTone(openShift.status)}>{statusLabel(openShift.status)}</Badge>
            </div>
          ) : employeeId ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]">
              No open shift — use <strong className="text-[var(--text-primary)]">Clock in</strong> to start.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              type="button"
              disabled={!canClockIn || mutation.isPending}
              title={
                mutation.isPending
                  ? "Saving…"
                  : !canClockIn
                    ? !employeeId
                      ? "Select an employee first"
                      : !storeId && !openShift
                        ? "Select a location first"
                        : openShift
                          ? "This employee already has an open shift"
                          : undefined
                    : undefined
              }
              onClick={() => submit("clock_in")}
            >
              Clock in
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canBreakStart || mutation.isPending}
              title={
                mutation.isPending
                  ? "Saving…"
                  : !canBreakStart
                    ? !openShift
                      ? "Employee needs an open shift first"
                      : openShift?.status === "on_break"
                        ? "Already on a break — use Break end first"
                        : undefined
                    : undefined
              }
              onClick={() => submit("break_start")}
            >
              Break start
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canBreakEnd || mutation.isPending}
              title={
                mutation.isPending
                  ? "Saving…"
                  : !canBreakEnd
                    ? openShift?.status !== "on_break"
                      ? "Start a break before ending it"
                      : undefined
                    : undefined
              }
              onClick={() => submit("break_end")}
            >
              Break end
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canClockOut || mutation.isPending}
              title={
                mutation.isPending
                  ? "Saving…"
                  : !canClockOut
                    ? !openShift
                      ? "No open shift to clock out"
                      : undefined
                    : undefined
              }
              onClick={() => submit("clock_out")}
            >
              Clock out
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="tc-notes">
              Notes (optional)
            </label>
            <Input
              id="tc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a short note if needed (optional)"
              maxLength={240}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
