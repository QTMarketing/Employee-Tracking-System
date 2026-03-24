"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchAuditLog, type AuditLogFilters } from "@/lib/api/audit-log";
import { queryKeys } from "@/lib/query-keys";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function AuditLogView() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [entityName, setEntityName] = useState("");
  const [action, setAction] = useState("");

  const filters: AuditLogFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      entityName: entityName.trim() || undefined,
      action: action.trim() || undefined,
    }),
    [from, to, entityName, action],
  );

  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.auditLog(filters),
    queryFn: () => fetchAuditLog(filters),
    retry: false,
  });

  const forbidden = isError && error instanceof Error && error.message.includes("only to admin");

  return (
    <div className="space-y-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          className="mb-4"
          as="h2"
          title="Search the audit log"
          description="Pick dates and optional text filters. You only see what your role allows—some people see a message instead of the list."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="al-from">
              From
            </label>
            <Input id="al-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={forbidden} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="al-to">
              To
            </label>
            <Input id="al-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={forbidden} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="al-entity">
              Record name contains
            </label>
            <Input
              id="al-entity"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="e.g. timesheet, employee"
              disabled={forbidden}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="al-action">
              Action contains
            </label>
            <Input
              id="al-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. clock in, edited"
              disabled={forbidden}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3 text-xs"
            onClick={() => refetch()}
            disabled={isFetching || forbidden}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <p className="text-xs text-[var(--text-muted)]">Change filters, then tap Refresh to load results.</p>
        </div>
      </Card>

      {isError && !forbidden ? (
        <Card className="border-[var(--border)] p-6 text-sm text-[var(--danger)]">
          <p>{error instanceof Error ? error.message : "Could not load the audit log."}</p>
          <Button type="button" variant="outline" className="mt-3 h-9 text-xs" onClick={() => refetch()}>
            Try again
          </Button>
        </Card>
      ) : forbidden ? (
        <Card className="border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
          {error instanceof Error ? error.message : "Access denied."}
        </Card>
      ) : (
        <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
          <div className="border-b border-[var(--border)] px-4 py-4">
            <SectionHeader
              as="h2"
              title="Audit log"
              description="Who changed what, and when, for time and employee records."
            />
          </div>
          <div className={`mx-4 mb-4 max-h-[min(560px,65vh)] ${dataTable.shell}`}>
            {isLoading ? (
              <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
                No results for these filters. Try a wider date range or clear the search boxes.
              </div>
            ) : (
              <table className={`${dataTable.table} min-w-[800px]`}>
                <thead className={`${dataTable.thead} sticky top-0 z-[1]`}>
                  <tr>
                    <th className={dataTable.th}>When</th>
                    <th className={dataTable.th}>Who</th>
                    <th className={dataTable.th}>Record</th>
                    <th className={dataTable.th}>Action</th>
                    <th className={dataTable.th}>Reason</th>
                    <th className={dataTable.th}>Detail</th>
                  </tr>
                </thead>
                <tbody className={dataTable.tbody}>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className={`${dataTable.tdMuted} whitespace-nowrap`}>{formatDt(row.createdAt)}</td>
                      <td className={dataTable.td}>
                        <div className="font-medium">{row.actorName}</div>
                        <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.actorUserId.slice(0, 8)}…</div>
                      </td>
                      <td className={dataTable.tdMuted}>
                        <span className="font-medium">{row.entityName}</span>
                        {row.entityId ? (
                          <div className="font-mono text-[10px] text-[var(--text-muted)]">{row.entityId.slice(0, 8)}…</div>
                        ) : null}
                      </td>
                      <td className={`${dataTable.td} font-mono text-xs`}>{row.action}</td>
                      <td className={`${dataTable.td} text-xs text-[var(--text-muted)]`}>{row.reasonCode ?? "—"}</td>
                      <td className={`${dataTable.tdMuted} max-w-[240px] text-xs`}>{row.detail}</td>
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
