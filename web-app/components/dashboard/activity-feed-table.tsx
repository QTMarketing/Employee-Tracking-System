"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { HTMLAttributes, useCallback } from "react";
import { toast } from "sonner";

import { fetchActivityFeed } from "@/lib/api/time-entries";
import { activityFeedToCsvMatrix, csvFilename, downloadTableCsv } from "@/lib/csv";
import { queryKeys } from "@/lib/query-keys";
import { isShiftStatusLabelAlert } from "@/lib/shift-attention";
import { cn } from "@/lib/utils";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ActivityFeedTable({ className }: HTMLAttributes<HTMLDivElement>) {
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.activityFeed,
    queryFn: fetchActivityFeed,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const downloadActivity = useCallback(() => {
    if (rows.length === 0) {
      toast.error("Nothing to download");
      return;
    }
    const { headers, rows: matrix } = activityFeedToCsvMatrix(rows);
    downloadTableCsv(csvFilename("recent-activity"), headers, matrix);
    toast.success("Download started");
  }, [rows]);

  return (
    <Card className={cn("flex min-h-0 flex-col overflow-hidden border-[var(--border)]", className)}>
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <SectionHeader
          as="h2"
          title="Recent activity"
          description="Latest clock activity and edits. Items that need attention appear first."
          meta={
            <span className="rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              Live
            </span>
          }
          actions={
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              disabled={isLoading || isError || rows.length === 0}
              onClick={downloadActivity}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading…</div>
      ) : isError ? (
        <div className="space-y-3 p-4">
          <p className="text-sm text-[var(--danger)]">Could not load recent activity.</p>
          <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--text-secondary)]">No recent activity for your locations.</div>
      ) : (
        <div className={cn("min-h-0", dataTable.shell)}>
          <table className={`${dataTable.table} min-w-[820px] border-collapse`}>
            <thead className={cn(dataTable.thead, "sticky top-0 z-[1]")}>
              <tr>
                <th className={`${dataTable.th} whitespace-nowrap`}>Employee</th>
                <th className={`${dataTable.th} whitespace-nowrap`}>What happened</th>
                <th className={`${dataTable.th} whitespace-nowrap tabular-nums`}>Time</th>
                <th className={`${dataTable.th} whitespace-nowrap`}>Shift status</th>
                <th
                  className={`${dataTable.th} min-w-[140px]`}
                  title="Shows edits, overtime on an open shift, or other items that may need follow-up."
                >
                  Needs attention
                </th>
                <th className={`${dataTable.th} whitespace-nowrap`}>Location</th>
                <th className={`${dataTable.th} whitespace-nowrap text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTable.tbody}>
              {rows.map((row) => {
                const shiftAlert = isShiftStatusLabelAlert(row.shiftStatus);
                const hot = Boolean(row.exception) || shiftAlert;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "bg-[var(--surface)] transition-colors",
                      hot &&
                      "bg-[color-mix(in_oklab,var(--warning)_14%,var(--surface))] ring-1 ring-inset ring-[color-mix(in_oklab,var(--warning)_45%,var(--border))]",
                    )}
                  >
                    <td className={`${dataTable.td} font-medium`}>{row.employeeName}</td>
                    <td className={dataTable.tdMuted}>{row.eventType}</td>
                    <td className={`${dataTable.tdMuted} tabular-nums`}>{formatTime(row.occurredAt)}</td>
                    <td className={dataTable.td}>
                      <Badge tone={hot ? "alert" : "neutral"}>{row.shiftStatus}</Badge>
                    </td>
                    <td className={`${dataTable.tdMuted} text-xs`}>
                      {row.exception ? (
                        <span className="font-medium text-[var(--warning)]">{row.exception}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className={dataTable.tdMuted}>{row.storeName}</td>
                    <td className={`${dataTable.td} text-right`}>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link
                          href="/time-clock"
                          className={cn(buttonVariants({ variant: "outline" }), "h-8 px-2 text-xs")}
                        >
                          View
                        </Link>
                        <Link
                          href="/timesheets"
                          className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-xs")}
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
