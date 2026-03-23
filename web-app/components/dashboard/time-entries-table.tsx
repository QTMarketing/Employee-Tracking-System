"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { fetchTimeEntries } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { type ActiveTimeEntry } from "@/lib/types/domain";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const columns: ColumnDef<ActiveTimeEntry>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all rows"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Select ${row.original.employeeName}`}
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: "employeeCode", header: "Employee ID" },
  { accessorKey: "employeeName", header: "Employee" },
  { accessorKey: "storeName", header: "Store" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const value = row.original.status;
      const tone = value === "flagged" ? "warning" : value === "clocked_in" ? "primary" : "success";
      const label = value === "clocked_in" ? "Clocked In" : value === "clocked_out" ? "Clocked Out" : value === "on_break" ? "On Break" : "Flagged";
      return <Badge tone={tone}>{label}</Badge>;
    },
  },
  { accessorKey: "regularHours", header: "Regular" },
  { accessorKey: "otHours", header: "OT" },
  { accessorKey: "dtHours", header: "DT" },
];

export function TimeEntriesTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { data: queryData = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.timeEntries,
    queryFn: fetchTimeEntries,
  });
  const data = useMemo(() => queryData, [queryData]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is intentionally used for data-grid behavior.
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Active Time Entries</h3>
        <div className="h-28 animate-pulse rounded-xl bg-[var(--surface-soft)]" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Active Time Entries</h3>
        <p className="text-sm text-[var(--danger)]">{error instanceof Error ? error.message : "Failed to load entries."}</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Active Time Entries</h3>
        <p className="text-sm text-[var(--text-secondary)]">No entries available yet. Create your first entry to begin.</p>
        <Button className="w-fit">Create Entry</Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Active Time Entries</h3>
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search employee, store, or status..."
          className="max-w-72"
        />
      </div>

      {table.getSelectedRowModel().rows.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-2">
          <p className="px-2 text-sm text-[var(--text-secondary)]">
            {table.getSelectedRowModel().rows.length} selected
          </p>
          <Button variant="outline">Approve Selected</Button>
          <Button variant="outline">Flag for Review</Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--surface-soft)] text-[var(--text-secondary)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border)]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-[var(--text-primary)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? String(cell.getValue() ?? "")}
                  </td>
                ))}
              </tr>
            ))}
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
