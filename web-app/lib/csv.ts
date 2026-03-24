import type { ActiveTimeEntry, ActivityFeedRow, TimesheetRow } from "@/lib/types/domain";

/**
 * CSV utilities: UTF-8 with BOM for Excel compatibility.
 */

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

/** Download CSV built from headers + row matrix. */
export function downloadTableCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const body = `\uFEFF${rowsToCsv(headers, rows)}`;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Download an already-built CSV string (adds BOM if missing). */
export function downloadCsvString(filename: string, csvBody: string): void {
  const body = csvBody.startsWith("\uFEFF") ? csvBody : `\uFEFF${csvBody}`;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function csvFilename(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}-${y}-${m}-${day}.csv`;
}

export function timesheetsToCsv(rows: TimesheetRow[]): string {
  const headers = [
    "Time entry ID",
    "Employee ID",
    "Employee name",
    "Employee code",
    "Store ID",
    "Store name",
    "Clock in (ISO)",
    "Clock out (ISO)",
    "Regular hours",
    "OT hours",
    "Double time hours",
    "Status",
    "Payroll approved at",
    "Payroll approved by",
  ];
  const data = rows.map((r) => [
    r.id,
    r.employeeId,
    r.employeeName,
    r.employeeCode,
    r.storeId,
    r.storeName,
    r.clockInAt,
    r.clockOutAt,
    r.regularHours,
    r.otHours,
    r.dtHours,
    r.status,
    r.payrollApprovedAt ?? "",
    r.payrollApprovedByName ?? "",
  ]);
  return rowsToCsv(headers, data);
}

export function activityFeedToCsvMatrix(rows: ActivityFeedRow[]): { headers: string[]; rows: unknown[][] } {
  const headers = [
    "ID",
    "Employee",
    "Event type",
    "Event key",
    "Occurred at (ISO)",
    "Shift status",
    "Exception",
    "Location",
  ];
  const data = rows.map((r) => [
    r.id,
    r.employeeName,
    r.eventType,
    r.eventTypeKey,
    r.occurredAt,
    r.shiftStatus,
    r.exception ?? "",
    r.storeName,
  ]);
  return { headers, rows: data };
}

export function openShiftsToCsvMatrix(rows: ActiveTimeEntry[]): { headers: string[]; rows: unknown[][] } {
  const headers = [
    "Shift ID",
    "Employee ID",
    "Employee name",
    "Employee code",
    "Status",
    "Regular hours",
    "OT hours",
    "Double time hours",
    "Store ID",
    "Store name",
  ];
  const data = rows.map((r) => [
    r.id,
    r.employeeId,
    r.employeeName,
    r.employeeCode,
    r.status,
    r.regularHours,
    r.otHours,
    r.dtHours,
    r.storeId,
    r.storeName,
  ]);
  return { headers, rows: data };
}
