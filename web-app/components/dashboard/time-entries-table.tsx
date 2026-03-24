"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { fetchTimeEntries } from "@/lib/api/time-entries";
import { csvFilename, downloadTableCsv, openShiftsToCsvMatrix } from "@/lib/csv";
import { queryKeys } from "@/lib/query-keys";
import { isActiveShiftAlert } from "@/lib/shift-attention";
import { type ActiveTimeEntry } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function statusRank(status: ActiveTimeEntry["status"]): number {
  if (status === "flagged") return 0;
  if (status === "on_break") return 1;
  return 2;
}

const columns: ColumnDef<ActiveTimeEntry>[] = [
  {
    id: "employee",
    header: "Employee",
    accessorFn: (row) => row.employeeName,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-[var(--text-primary)]">{row.original.employeeName}</div>
        <div className="font-mono text-xs text-[var(--text-muted)]">{row.original.employeeCode}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const value = row.original.status;
      const label =
        value === "clocked_in"
          ? "Clocked in"
          : value === "clocked_out"
            ? "Clocked out"
            : value === "on_break"
              ? "On break"
              : "Flagged";
      const tone = isActiveShiftAlert(value) ? "alert" : value === "clocked_in" ? "success" : "neutral";
      return <Badge tone={tone}>{label}</Badge>;
    },
  },
  {
    id: "hours",
    header: () => <span className="tabular-nums">Hours (regular / OT / double time)</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
        {row.original.regularHours} / {row.original.otHours} / {row.original.dtHours}
      </span>
    ),
  },
  { accessorKey: "storeName", header: "Location" },
  {
    id: "actions",
    header: () => <span className="text-right">Actions</span>,
    cell: ({ row }) => (
      <div className="flex flex-wrap justify-end gap-1">
        <Link href="/time-clock" className={cn(buttonVariants({ variant: "outline" }), "h-8 px-2 text-xs")}>
          View
        </Link>
        <Link href="/timesheets" className={cn(buttonVariants({ variant: "outline" }), "h-8 px-2 text-xs")}>
          Approve
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() =>
            toast.info(`Flag ${row.original.employeeName} for review`, {
              description: "This button will be connected to your review process in a future update.",
            })
          }
        >
          Flag
        </Button>
      </div>
    ),
    enableSorting: false,
  },
];

export function TimeEntriesTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const { data: queryData = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.timeEntries,
    queryFn: fetchTimeEntries,
  });

  const data = useMemo(() => {
    const list = [...queryData];
    list.sort((a, b) => statusRank(a.status) - statusRank(b.status));
    return list;
  }, [queryData]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is intentionally used for data-grid behavior.
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "")
        .toLowerCase()
        .trim();
      if (!q) return true;
      const r = row.original;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.storeName.toLowerCase().includes(q)
      );
    },
  });

  function downloadFilteredCsv() {
    const filtered = table.getFilteredRowModel().rows.map((r) => r.original);
    if (filtered.length === 0) {
      toast.error("Nothing to download");
      return;
    }
    const { headers, rows: matrix } = openShiftsToCsvMatrix(filtered);
    const suffix = globalFilter.trim() ? "-filtered" : "";
    downloadTableCsv(csvFilename(`open-shifts${suffix}`), headers, matrix);
    toast.success("Download started");
  }

  const sectionCopy = {
    title: "Open shifts",
    description:
      "Who is on the clock and today’s hours (regular, overtime, and double time). Rows that need attention appear first. Approve on Timesheets when a shift is ready for payroll.",
  };

  if (isLoading) {
    return (
      <Card className="space-y-3">
        <SectionHeader title={sectionCopy.title} description={sectionCopy.description} />
        <div className="h-28 animate-pulse rounded-xl bg-[var(--surface-soft)]" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="space-y-3">
        <SectionHeader title={sectionCopy.title} description={sectionCopy.description} />
        <p className="text-sm text-[var(--danger)]">{error instanceof Error ? error.message : "Could not load this list."}</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="space-y-3">
        <SectionHeader title={sectionCopy.title} description={sectionCopy.description} />
        <p className="text-sm text-[var(--text-secondary)]">No one has an open shift. Use Time clock to clock someone in.</p>
        <Link href="/time-clock" className={cn(buttonVariants({ variant: "primary" }), "w-fit")}>
          Go to time clock
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <SectionHeader
        as="h2"
        title={sectionCopy.title}
        description={sectionCopy.description}
        actions={
          <>
            <Button type="button" variant="outline" className="h-9 gap-1.5 text-xs" onClick={downloadFilteredCsv}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </Button>
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Search by name, code, or location…"
              className="w-full min-w-0 sm:max-w-72"
            />
          </>
        }
      />

      <div className={dataTable.shell}>
        <table className={`${dataTable.table} min-w-[640px]`}>
          <thead className={dataTable.thead}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={cn(dataTable.th, header.id === "actions" && "text-right")}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={dataTable.tbody}>
            {table.getRowModel().rows.map((row) => {
              const alertRow = isActiveShiftAlert(row.original.status);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "bg-[var(--surface)] transition-colors",
                    alertRow && "bg-amber-100 ring-1 ring-inset ring-amber-300/80",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(dataTable.td, cell.column.id === "actions" && "text-right")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? String(cell.getValue() ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">Page {table.getState().pagination.pageIndex + 1}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
