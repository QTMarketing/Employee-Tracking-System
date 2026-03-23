export type AppRole = "admin" | "sub_admin" | "store_manager" | "employee";

export type TimeEventType = "clock_in" | "clock_out" | "break_start" | "break_end" | "admin_manual";

export type TimeEntryStatus = "clocked_in" | "on_break" | "clocked_out" | "flagged";

export type ActiveTimeEntry = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  status: TimeEntryStatus;
  regularHours: number;
  otHours: number;
  dtHours: number;
};

export type CreateClockEventInput = {
  employeeId: string;
  storeId: string;
  action: Exclude<TimeEventType, "admin_manual">;
  notes?: string;
};

export type EntryOption = {
  id: string;
  label: string;
};

export type TimeEntryOptions = {
  employees: EntryOption[];
  stores: EntryOption[];
};

export type DashboardKpiItem = {
  label: string;
  value: string;
  change: string;
  tone: "primary" | "warning" | "success" | "accent";
};

export type DashboardLinePoint = {
  day: string;
  hours: number;
  ot: number;
};

export type DashboardBarPoint = {
  store: string;
  laborCost: number;
  laborPct: number;
};

export type DashboardChartData = {
  lineData: DashboardLinePoint[];
  barData: DashboardBarPoint[];
};

export type HourMixSegment = {
  name: "Regular" | "OT" | "DT";
  value: number;
};

export type HourMixData = {
  totalHours: number;
  segments: HourMixSegment[];
};

/** Detailed hour-mix breakdown for reports (active / in-progress scope). */
export type HourMixReportEmployeeRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  status: TimeEntryStatus;
  regularHours: number;
  otHours: number;
  dtHours: number;
  totalHours: number;
};

export type HourMixReportStoreRow = {
  storeId: string;
  storeName: string;
  regularHours: number;
  otHours: number;
  dtHours: number;
  totalHours: number;
  activeShiftCount: number;
};

export type HourMixReportData = {
  summary: HourMixData;
  generatedAt: string;
  scopeDescription: string;
  byEmployee: HourMixReportEmployeeRow[];
  byStore: HourMixReportStoreRow[];
};
