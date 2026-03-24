"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { fetchSession } from "@/lib/api/session";
import { fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { createPtoRequest, fetchPtoRequests, updatePtoRequest } from "@/lib/api/pto-schedules";
import { queryKeys } from "@/lib/query-keys";
import type { AppRole, PtoRequestRow } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function canManagePto(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "sub_admin" || role === "store_manager";
}

function formatDay(isoDate: string): string {
  try {
    return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function statusTone(s: PtoRequestRow["status"]): "success" | "warning" | "alert" | "neutral" {
  if (s === "approved") return "success";
  if (s === "pending") return "warning";
  if (s === "denied") return "alert";
  return "neutral";
}

function statusLabel(s: PtoRequestRow["status"]): string {
  if (s === "approved") return "Approved";
  if (s === "denied") return "Denied";
  if (s === "cancelled") return "Cancelled";
  return "Pending";
}

export function PtoView() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: queryKeys.session, queryFn: fetchSession });
  const optionsQuery = useQuery({ queryKey: queryKeys.timeEntryOptions, queryFn: fetchTimeEntryOptions });
  const ptoQuery = useQuery({ queryKey: queryKeys.ptoRequests, queryFn: fetchPtoRequests });

  const viewerId = sessionQuery.data?.userId ?? null;
  const manage = canManagePto(sessionQuery.data?.role);

  const createMutation = useMutation({
    mutationFn: createPtoRequest,
    onSuccess: async () => {
      toast.success("Request submitted");
      await queryClient.invalidateQueries({ queryKey: queryKeys.ptoRequests });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePtoRequest>[1] }) =>
      updatePtoRequest(id, body),
    onSuccess: async () => {
      toast.success("Updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.ptoRequests });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    storeId: "",
    employeeId: "",
    requestType: "vacation" as PtoRequestRow["requestType"],
    startDate: "",
    endDate: "",
    note: "",
  });

  function onSubmitPto(e: FormEvent) {
    e.preventDefault();
    if (!form.storeId || !form.startDate || !form.endDate) {
      toast.error("Choose location and dates");
      return;
    }
    createMutation.mutate({
      storeId: form.storeId,
      employeeId: manage && form.employeeId ? form.employeeId : undefined,
      requestType: form.requestType,
      startDate: form.startDate,
      endDate: form.endDate,
      note: form.note.trim() || null,
    });
  }

  return (
    <div className="space-y-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          as="h2"
          title="New time-off request"
          description={
            manage
              ? "Submit on behalf of a team member or yourself. Employees only see their own requests below."
              : "Submit vacation, sick, or personal time. Your manager will review pending requests."
          }
        />
        <form onSubmit={onSubmitPto} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manage ? (
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Employee
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Yourself / default (demo)</option>
                {(optionsQuery.data?.employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Location
            <select
              required
              value={form.storeId}
              onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="">Select store</option>
              {(optionsQuery.data?.stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Type
            <select
              value={form.requestType}
              onChange={(e) =>
                setForm((f) => ({ ...f, requestType: e.target.value as PtoRequestRow["requestType"] }))
              }
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Start date
            <Input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            End date
            <Input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Note (optional)
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Optional context for your manager"
              maxLength={500}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={createMutation.isPending || optionsQuery.isLoading}>
              {createMutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <SectionHeader
            as="h2"
            title="Requests"
            description="Newest first. Managers can approve or deny pending items; employees can cancel their own pending request."
          />
        </div>
        {ptoQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading…</div>
        ) : ptoQuery.isError ? (
          <div className="p-6 text-sm text-[var(--danger)]">
            {ptoQuery.error instanceof Error ? ptoQuery.error.message : "Could not load PTO."}
          </div>
        ) : (ptoQuery.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">No requests yet.</div>
        ) : (
          <div className={cn("mx-4 mb-4 max-h-[min(520px,60vh)]", dataTable.shell)}>
            <table className={`${dataTable.table} min-w-[900px]`}>
              <thead className={`${dataTable.thead} sticky top-0 z-[1]`}>
                <tr>
                  <th className={dataTable.th}>Employee</th>
                  <th className={dataTable.th}>Store</th>
                  <th className={dataTable.th}>Type</th>
                  <th className={dataTable.th}>Dates</th>
                  <th className={dataTable.th}>Status</th>
                  <th className={dataTable.th}>Note</th>
                  <th className={dataTable.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={dataTable.tbody}>
                {(ptoQuery.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className={dataTable.td}>
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="font-mono text-xs text-[var(--text-muted)]">{row.employeeCode}</div>
                    </td>
                    <td className={dataTable.tdMuted}>{row.storeName}</td>
                    <td className={dataTable.tdMuted} style={{ textTransform: "capitalize" }}>
                      {row.requestType}
                    </td>
                    <td className={`${dataTable.tdMuted} text-xs`}>
                      {formatDay(row.startDate)}
                      {row.endDate !== row.startDate ? ` → ${formatDay(row.endDate)}` : null}
                    </td>
                    <td className={dataTable.td}>
                      <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                      {row.reviewedByName ? (
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">by {row.reviewedByName}</div>
                      ) : null}
                    </td>
                    <td className={`${dataTable.tdMuted} max-w-[200px] truncate text-xs`} title={row.note ?? ""}>
                      {row.note ?? "—"}
                    </td>
                    <td className={dataTable.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === "pending" && manage ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: row.id, body: { status: "approved" } })}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: row.id, body: { status: "denied" } })}
                            >
                              Deny
                            </Button>
                          </>
                        ) : null}
                        {row.status === "pending" && viewerId === row.employeeId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            disabled={updateMutation.isPending}
                            onClick={() => updateMutation.mutate({ id: row.id, body: { status: "cancelled" } })}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
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
