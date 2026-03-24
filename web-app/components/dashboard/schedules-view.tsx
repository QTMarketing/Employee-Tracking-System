"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchSession } from "@/lib/api/session";
import { fetchTimeEntryOptions } from "@/lib/api/time-entries";
import {
  createScheduledShift,
  deleteScheduledShift,
  fetchScheduledShifts,
} from "@/lib/api/pto-schedules";
import { queryKeys } from "@/lib/query-keys";
import type { AppRole, ScheduledShiftRow } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function canManageSchedules(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "sub_admin" || role === "store_manager";
}

function defaultRange() {
  const from = new Date();
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 14);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function defaultShiftLocalTimes() {
  const s = new Date();
  s.setUTCDate(s.getUTCDate() + 1);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s);
  e.setHours(17, 0, 0, 0);
  return { startLocal: toDatetimeLocalValue(s), endLocal: toDatetimeLocalValue(e) };
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatShiftRange(startAt: string, endAt: string): string {
  try {
    const a = new Date(startAt);
    const b = new Date(endAt);
    return `${a.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} → ${b.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  } catch {
    return `${startAt} – ${endAt}`;
  }
}

const templateLabels: Record<ScheduledShiftRow["shiftTemplate"], string> = {
  morning: "Morning",
  evening: "Evening",
  overnight: "Overnight",
  custom: "Custom",
};

export function SchedulesView() {
  const queryClient = useQueryClient();
  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [storeId, setStoreId] = useState("");

  const sessionQuery = useQuery({ queryKey: queryKeys.session, queryFn: fetchSession });
  const optionsQuery = useQuery({ queryKey: queryKeys.timeEntryOptions, queryFn: fetchTimeEntryOptions });
  const manage = canManageSchedules(sessionQuery.data?.role);

  const filters = useMemo(
    () => ({ from, to, storeId: storeId || undefined }),
    [from, to, storeId],
  );

  const shiftsQuery = useQuery({
    queryKey: queryKeys.scheduledShifts(filters),
    queryFn: () => fetchScheduledShifts(filters),
  });

  const defaults = useMemo(() => defaultShiftLocalTimes(), []);
  const [shiftForm, setShiftForm] = useState({
    storeId: "",
    employeeId: "",
    shiftTemplate: "custom" as ScheduledShiftRow["shiftTemplate"],
    startLocal: defaults.startLocal,
    endLocal: defaults.endLocal,
    roleLabel: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: createScheduledShift,
    onSuccess: async () => {
      toast.success("Shift scheduled");
      await queryClient.invalidateQueries({ queryKey: ["scheduled-shifts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledShift,
    onSuccess: async () => {
      toast.success("Shift removed");
      await queryClient.invalidateQueries({ queryKey: ["scheduled-shifts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreateShift(e: FormEvent) {
    e.preventDefault();
    if (!shiftForm.storeId || !shiftForm.employeeId) {
      toast.error("Choose store and employee");
      return;
    }
    const startAt = new Date(shiftForm.startLocal).toISOString();
    const endAt = new Date(shiftForm.endLocal).toISOString();
    createMutation.mutate({
      storeId: shiftForm.storeId,
      employeeId: shiftForm.employeeId,
      startAt,
      endAt,
      shiftTemplate: shiftForm.shiftTemplate,
      roleLabel: shiftForm.roleLabel.trim() || null,
      notes: shiftForm.notes.trim() || null,
    });
  }

  return (
    <div className="space-y-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          as="h2"
          title="Schedule window"
          description="Pick a date range and optional location, then refresh. Shown shifts overlap this window."
        />
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Location
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">All your locations</option>
                {(optionsQuery.data?.stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              From
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              To
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => shiftsQuery.refetch()}
            disabled={shiftsQuery.isFetching}
          >
            {shiftsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </Card>

      {manage ? (
        <Card className="border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
          <SectionHeader
            as="h2"
            title="Add shift"
            description="Creates a planned shift for payroll and coverage. Times use your browser’s local timezone."
          />
          <form onSubmit={onCreateShift} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Store
              <select
                required
                value={shiftForm.storeId}
                onChange={(e) => setShiftForm((f) => ({ ...f, storeId: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Select</option>
                {(optionsQuery.data?.stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Employee
              <select
                required
                value={shiftForm.employeeId}
                onChange={(e) => setShiftForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Select</option>
                {(optionsQuery.data?.employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Template
              <select
                value={shiftForm.shiftTemplate}
                onChange={(e) =>
                  setShiftForm((f) => ({
                    ...f,
                    shiftTemplate: e.target.value as ScheduledShiftRow["shiftTemplate"],
                  }))
                }
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="overnight">Overnight</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Start (local)
              <Input
                type="datetime-local"
                required
                value={shiftForm.startLocal}
                onChange={(e) => setShiftForm((f) => ({ ...f, startLocal: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              End (local)
              <Input
                type="datetime-local"
                required
                value={shiftForm.endLocal}
                onChange={(e) => setShiftForm((f) => ({ ...f, endLocal: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Role / job label (optional)
              <Input
                value={shiftForm.roleLabel}
                onChange={(e) => setShiftForm((f) => ({ ...f, roleLabel: e.target.value }))}
                placeholder="e.g. Cashier"
                maxLength={120}
              />
            </label>
            <label className="md:col-span-2 lg:col-span-3 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Notes (optional)
              <Input
                value={shiftForm.notes}
                onChange={(e) => setShiftForm((f) => ({ ...f, notes: e.target.value }))}
                maxLength={500}
              />
            </label>
            <div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save shift"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
          You can view shifts for your locations. Only managers can add or remove assignments.
        </Card>
      )}

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <SectionHeader
            as="h2"
            title="Planned shifts"
            description="Ordered by start time. Delete removes the plan only — it does not change time punches."
          />
        </div>
        {shiftsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading…</div>
        ) : shiftsQuery.isError ? (
          <div className="p-6 text-sm text-[var(--danger)]">
            {shiftsQuery.error instanceof Error ? shiftsQuery.error.message : "Could not load schedules."}
          </div>
        ) : (shiftsQuery.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
            No shifts in this range. {manage ? "Add one above or widen the dates." : "Try widening the date range."}
          </div>
        ) : (
          <div className={cn("mx-4 mb-4 max-h-[min(520px,60vh)]", dataTable.shell)}>
            <table className={`${dataTable.table} min-w-[860px]`}>
              <thead className={`${dataTable.thead} sticky top-0 z-[1]`}>
                <tr>
                  <th className={dataTable.th}>When</th>
                  <th className={dataTable.th}>Employee</th>
                  <th className={dataTable.th}>Store</th>
                  <th className={dataTable.th}>Template</th>
                  <th className={dataTable.th}>Role</th>
                  <th className={dataTable.th}>Notes</th>
                  {manage ? <th className={dataTable.th}>Actions</th> : null}
                </tr>
              </thead>
              <tbody className={dataTable.tbody}>
                {(shiftsQuery.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className={`${dataTable.tdMuted} text-xs`}>{formatShiftRange(row.startAt, row.endAt)}</td>
                    <td className={dataTable.td}>
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="font-mono text-xs text-[var(--text-muted)]">{row.employeeCode}</div>
                    </td>
                    <td className={dataTable.tdMuted}>{row.storeName}</td>
                    <td className={dataTable.td}>
                      <Badge tone="neutral">{templateLabels[row.shiftTemplate]}</Badge>
                    </td>
                    <td className={dataTable.tdMuted}>{row.roleLabel ?? "—"}</td>
                    <td className={`${dataTable.tdMuted} max-w-[180px] truncate text-xs`}>{row.notes ?? "—"}</td>
                    {manage ? (
                      <td className={dataTable.td}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-[var(--danger)]"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(row.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
