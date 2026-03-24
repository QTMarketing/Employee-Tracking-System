"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { submitPayrollApproval } from "@/lib/api/payroll";
import { fetchTimesheets } from "@/lib/api/timesheets";
import { downloadCsvString, timesheetsToCsv } from "@/lib/csv";
import { PAY_PERIOD_LABELS, payPeriodRange, type PayPeriodPreset } from "@/lib/pay-period";
import { queryKeys } from "@/lib/query-keys";
import { isActiveShiftAlert } from "@/lib/shift-attention";
import type { TimesheetRow } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function statusLabel(status: TimesheetRow["status"]): string {
  if (status === "clocked_out") return "Closed";
  if (status === "flagged") return "Flagged";
  if (status === "on_break") return "On break";
  return "Open";
}

function statusTone(status: TimesheetRow["status"]): "alert" | "success" | "neutral" | "primary" {
  if (isActiveShiftAlert(status)) return "alert";
  if (status === "clocked_out") return "success";
  if (status === "clocked_in") return "primary";
  return "neutral";
}

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 14);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function TimesheetsView() {
  const queryClient = useQueryClient();
  const initial = useMemo(() => defaultDateRange(), []);
  const [storeId, setStoreId] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const filters = useMemo(
    () => ({
      storeId: storeId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [storeId, from, to],
  );

  const { data: options } = useQuery({
    queryKey: queryKeys.timeEntryOptions,
    queryFn: fetchTimeEntryOptions,
  });

  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.timesheets(filters),
    queryFn: () => fetchTimesheets(filters),
  });

  const payrollMutation = useMutation({
    mutationFn: submitPayrollApproval,
    onSuccess: async (res, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardKpis });
      const ids = variables.timeEntryIds;
      if (res.updated > 0) {
        if (ids.length === 1) {
          const row = rows.find((r) => r.id === ids[0]);
          const name = row?.employeeName ?? "Employee";
          toast.success(
            variables.approved ? `Marked approved for payroll: ${name}` : `Removed payroll approval: ${name}`,
          );
        } else {
          toast.success(`Updated ${res.updated} row(s)`);
        }
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function applyPreset(preset: PayPeriodPreset) {
    const r = payPeriodRange(preset);
    setFrom(r.from);
    setTo(r.to);
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const safeFrom = from || "all";
    const safeTo = to || "all";
    downloadCsvString(`timesheets-${safeFrom}-${safeTo}.csv`, timesheetsToCsv(rows));
    toast.success("Download started");
  }

  return (
    <div className="space-y-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          className="mb-4"
          as="h2"
          title="Dates and locations"
          description="Choose a quick pay-period shortcut or set dates yourself, pick locations, then Refresh. Open shifts stay on Overview and Time clock until someone clocks out."
        />
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Quick date ranges</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(PAY_PERIOD_LABELS) as PayPeriodPreset[]).map((preset) => (
            <Button key={preset} type="button" variant="outline" className="h-8 text-xs" onClick={() => applyPreset(preset)}>
              {PAY_PERIOD_LABELS[preset]}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="ts-store">
                Location
              </label>
              <select
                id="ts-store"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">All your locations</option>
                {(options?.stores ?? []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="ts-from">
                From
              </label>
              <Input id="ts-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="ts-to">
                To
              </label>
              <Input id="ts-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              Download CSV
            </Button>
          </div>
        </div>
      </Card>

      {isError ? (
        <Card className="border-[var(--border)] p-6 text-sm text-[var(--danger)]">
          {error instanceof Error ? error.message : "Could not load timesheets."}
        </Card>
      ) : (
        <Card className="relative overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
          {isFetching && !isLoading ? (
            <div
              className="absolute inset-x-0 top-0 z-[2] border-b border-[color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] py-1.5 text-center text-xs font-medium text-[var(--text-secondary)]"
              role="status"
            >
              Updating…
            </div>
          ) : null}
          <div className="border-b border-[var(--border)] px-4 py-4">
            <SectionHeader
              as="h2"
              title="Timesheet rows"
              description="Finished shifts with regular, overtime, and double time. Approve here before payroll, or download a file."
            />
          </div>
          <div className={`mx-4 mb-4 max-h-[min(560px,65vh)] ${dataTable.shell}`}>
            {isLoading ? (
              <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
                No finished shifts in this date range. Open shifts stay on Overview and Time clock until someone clocks
                out.
              </div>
            ) : (
              <table className={`${dataTable.table} min-w-[920px]`}>
                <thead className={`${dataTable.thead} sticky top-0 z-[1]`}>
                  <tr>
                    <th className={dataTable.th}>Employee</th>
                    <th className={dataTable.th}>Store</th>
                    <th className={dataTable.th}>Clock in</th>
                    <th className={dataTable.th}>Clock out</th>
                    <th className={dataTable.th}>Regular / OT / double time</th>
                    <th className={dataTable.th}>Status</th>
                    <th className={dataTable.th}>Payroll approval</th>
                    <th className={dataTable.th}>Actions</th>
                  </tr>
                </thead>
                <tbody className={dataTable.tbody}>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className={dataTable.td}>
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.employeeCode}</div>
                      </td>
                      <td className={dataTable.tdMuted}>{row.storeName}</td>
                      <td className={dataTable.tdMuted}>{formatDt(row.clockInAt)}</td>
                      <td className={dataTable.tdMuted}>{formatDt(row.clockOutAt)}</td>
                      <td className={`${dataTable.tdMuted} font-mono text-xs`}>
                        {row.regularHours} / {row.otHours} / {row.dtHours}
                      </td>
                      <td className={dataTable.td}>
                        <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td className={`${dataTable.tdMuted} text-xs`}>
                        {row.payrollApprovedAt ? (
                          <span>
                            ✓ {formatDt(row.payrollApprovedAt)}
                            {row.payrollApprovedByName ? (
                              <span className="block text-[var(--text-muted)]">by {row.payrollApprovedByName}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Pending</span>
                        )}
                      </td>
                      <td className={dataTable.td}>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            disabled={payrollMutation.isPending || Boolean(row.payrollApprovedAt)}
                            onClick={() => payrollMutation.mutate({ timeEntryIds: [row.id], approved: true })}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            disabled={payrollMutation.isPending || !row.payrollApprovedAt}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remove the payroll OK for ${row.employeeName}? You can approve again later.`,
                                )
                              ) {
                                return;
                              }
                              payrollMutation.mutate({ timeEntryIds: [row.id], approved: false });
                            }}
                          >
                            Remove approval
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
