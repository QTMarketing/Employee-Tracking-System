import {
  getLaborEstimateBlendedRateUsd,
  laborCostsToBarPoints,
  weightedHoursForLaborEstimate,
} from "@/lib/labor-estimate";
import {
  ActiveTimeEntry,
  AuditLogRow,
  DashboardChartData,
  DashboardKpiItem,
  EmployeeRosterData,
  EntryOption,
  HourMixData,
  HourMixReportData,
  ActivityFeedRow,
  HourMixReportEmployeeRow,
  HourMixReportStoreRow,
  PolicyConfigRow,
  PtoRequestRow,
  ScheduledShiftRow,
  TimesheetRow,
} from "@/lib/types/domain";

export type PolicyConfigNumericPatch = Partial<
  Pick<
    PolicyConfigRow,
    | "overtimeDailyThreshold"
    | "doubleTimeDailyThreshold"
    | "overtimeWeeklyThreshold"
    | "autoClockOutHours"
    | "roundingMode"
  >
>;

export type AuditLogFilters = {
  from?: string;
  to?: string;
  entityName?: string;
  action?: string;
};

type EventAction = "clock_in" | "clock_out" | "break_start" | "break_end" | "admin_manual";

type InternalShift = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  status: ActiveTimeEntry["status"];
  regularHours: number;
  otHours: number;
  dtHours: number;
  clockInAt: string;
  clockOutAt: string | null;
  hasOpenBreak: boolean;
};

type EventRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  action: EventAction;
  occurredAt: string;
  notes?: string;
};

const stores: EntryOption[] = [
  { id: "44444444-4444-4444-8444-444444444444", label: "Downtown" },
  { id: "55555555-5555-4555-8555-555555555555", label: "Northside" },
  { id: "66666666-6666-4666-8666-666666666666", label: "Lakeside" },
  { id: "77777777-7777-4777-8777-777777777777", label: "West End" },
];

const employees: EntryOption[] = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Rose Smith" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Robert Fox" },
  { id: "33333333-3333-4333-8333-333333333333", label: "Theresa Webb" },
  { id: "88888888-8888-4888-8888-888888888888", label: "Ronald Richards" },
  { id: "99999999-9999-4999-8999-999999999999", label: "Helen Ho" },
];

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const daysAgo = (d: number, hours = 9) =>
  new Date(now.getTime() - d * 86_400_000 - (now.getHours() - hours) * 3_600_000).toISOString();
const daysFromNow = (d: number, hours = 9) =>
  new Date(now.getTime() + d * 86_400_000 - (now.getHours() - hours) * 3_600_000).toISOString();

const shifts: InternalShift[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    employeeId: employees[0]!.id,
    employeeCode: "EMP-1007",
    employeeName: employees[0]!.label,
    storeId: stores[0]!.id,
    storeName: stores[0]!.label,
    status: "clocked_in",
    regularHours: 6.5,
    otHours: 0,
    dtHours: 0,
    clockInAt: minutesAgo(390),
    clockOutAt: null,
    hasOpenBreak: false,
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    employeeId: employees[1]!.id,
    employeeCode: "EMP-1023",
    employeeName: employees[1]!.label,
    storeId: stores[2]!.id,
    storeName: stores[2]!.label,
    status: "flagged",
    regularHours: 7.2,
    otHours: 0.5,
    dtHours: 0,
    clockInAt: minutesAgo(470),
    clockOutAt: null,
    hasOpenBreak: false,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    employeeId: employees[2]!.id,
    employeeCode: "EMP-1040",
    employeeName: employees[2]!.label,
    storeId: stores[1]!.id,
    storeName: stores[1]!.label,
    status: "on_break",
    regularHours: 5.9,
    otHours: 0,
    dtHours: 0,
    clockInAt: minutesAgo(350),
    clockOutAt: null,
    hasOpenBreak: true,
  },
  {
    id: "a5555555-5555-4555-8555-555555555555",
    employeeId: employees[4]!.id,
    employeeCode: "EMP-1069",
    employeeName: employees[4]!.label,
    storeId: stores[3]!.id,
    storeName: stores[3]!.label,
    status: "clocked_in",
    regularHours: 4.1,
    otHours: 0,
    dtHours: 0,
    clockInAt: minutesAgo(245),
    clockOutAt: null,
    hasOpenBreak: false,
  },
];

const events: EventRecord[] = [
  {
    id: "e1111111-1111-4111-8111-111111111111",
    employeeId: employees[0]!.id,
    employeeName: employees[0]!.label,
    storeId: stores[0]!.id,
    storeName: stores[0]!.label,
    action: "clock_in",
    occurredAt: minutesAgo(18),
  },
  {
    id: "e2222222-2222-4222-8222-222222222222",
    employeeId: employees[1]!.id,
    employeeName: employees[1]!.label,
    storeId: stores[2]!.id,
    storeName: stores[2]!.label,
    action: "admin_manual",
    occurredAt: minutesAgo(43),
    notes: "Correction request reviewed",
  },
  {
    id: "e3333333-3333-4333-8333-333333333333",
    employeeId: employees[2]!.id,
    employeeName: employees[2]!.label,
    storeId: stores[1]!.id,
    storeName: stores[1]!.label,
    action: "break_start",
    occurredAt: minutesAgo(64),
  },
];

function nextId(prefix: "shift" | "event"): string {
  const rand = Math.random().toString(16).slice(2, 10);
  const base = `${Date.now()}`.slice(-8);
  return `${prefix}-${base}-${rand}`;
}

function toActiveEntry(shift: InternalShift): ActiveTimeEntry {
  return {
    id: shift.id,
    employeeId: shift.employeeId,
    employeeCode: shift.employeeCode,
    employeeName: shift.employeeName,
    storeId: shift.storeId,
    storeName: shift.storeName,
    status: shift.status,
    regularHours: shift.regularHours,
    otHours: shift.otHours,
    dtHours: shift.dtHours,
  };
}

function findStoreLabel(storeId: string): string {
  return stores.find((store) => store.id === storeId)?.label ?? "Unknown Store";
}

function findEmployeeLabel(employeeId: string): string {
  return employees.find((employee) => employee.id === employeeId)?.label ?? "Unknown Employee";
}

function findEmployeeCode(employeeId: string): string {
  const found = shifts.find((shift) => shift.employeeId === employeeId)?.employeeCode;
  return found ?? `EMP-${employeeId.slice(0, 4).toUpperCase()}`;
}

/** Mock store ↔ employee links (primary = default home store for roster badges). */
const mockRosterAssignments: { storeIndex: number; employeeIndex: number; isPrimary: boolean }[] = [
  { storeIndex: 0, employeeIndex: 0, isPrimary: true },
  { storeIndex: 2, employeeIndex: 1, isPrimary: true },
  { storeIndex: 1, employeeIndex: 1, isPrimary: false },
  { storeIndex: 1, employeeIndex: 2, isPrimary: true },
  { storeIndex: 3, employeeIndex: 3, isPrimary: true },
  { storeIndex: 2, employeeIndex: 4, isPrimary: true },
];

export function getMockTimeEntryOptions() {
  return {
    employees,
    stores,
  };
}

export function getMockEmployeeRoster(): EmployeeRosterData {
  const byStore = stores.map((store, storeIndex) => {
    const links = mockRosterAssignments.filter((link) => link.storeIndex === storeIndex);
    const rosterEmployees = links
      .map((link) => {
        const emp = employees[link.employeeIndex]!;
        return {
          id: emp.id,
          fullName: emp.label,
          employeeCode: findEmployeeCode(emp.id),
          status: "active" as const,
          isPrimaryForStore: link.isPrimary,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    return {
      storeId: store.id,
      storeName: store.label,
      employees: rosterEmployees,
    };
  });

  const uniqueIds = new Set(mockRosterAssignments.map((link) => employees[link.employeeIndex]!.id));

  return {
    byStore,
    uniqueEmployeeCount: uniqueIds.size,
  };
}

export function getMockTimeEntries(): ActiveTimeEntry[] {
  return shifts.filter((shift) => shift.clockOutAt === null).map(toActiveEntry);
}

export function getMockActiveShifts(): ActiveTimeEntry[] {
  return shifts
    .filter((shift) => shift.clockOutAt === null && (shift.status === "clocked_in" || shift.status === "on_break"))
    .map(toActiveEntry);
}

function eventTypeDisplay(action: EventAction): string {
  if (action === "clock_in") return "Clock in";
  if (action === "clock_out") return "Clock out";
  if (action === "break_start") return "Break start";
  if (action === "break_end") return "Break end";
  return "Manual adjustment";
}

function openShiftForEmployee(employeeId: string): InternalShift | undefined {
  return shifts.find((s) => s.employeeId === employeeId && s.clockOutAt === null);
}

function shiftStatusLabel(shift: InternalShift | undefined): string {
  if (!shift) return "—";
  if (shift.status === "clocked_in") return "Clocked in";
  if (shift.status === "on_break") return "On break";
  if (shift.status === "flagged") return "Flagged";
  return "Clocked out";
}

function exceptionForEvent(event: EventRecord): string | null {
  const shift = openShiftForEmployee(event.employeeId);
  if (shift?.status === "flagged") return "Flagged shift — review hours";
  if (event.action === "admin_manual") return "Manual time correction";
  if (shift && shift.otHours > 0) return "Overtime on open shift";
  return null;
}

export function getMockActivityFeedRows(): ActivityFeedRow[] {
  const rows: ActivityFeedRow[] = events.map((event) => {
    const shift = openShiftForEmployee(event.employeeId);
    return {
      id: event.id,
      employeeName: event.employeeName,
      eventType: eventTypeDisplay(event.action),
      eventTypeKey: event.action,
      occurredAt: event.occurredAt,
      shiftStatus: shiftStatusLabel(shift),
      exception: exceptionForEvent(event),
      storeName: event.storeName,
    };
  });

  return rows
    .sort((a, b) => {
      const crit = (a.exception ? 1 : 0) - (b.exception ? 1 : 0);
      if (crit !== 0) return -crit;
      return a.occurredAt < b.occurredAt ? 1 : -1;
    })
    .slice(0, 12);
}

export function getMockKpis(): DashboardKpiItem[] {
  const activeCount = getMockActiveShifts().length;
  const flaggedOpen = shifts.filter((shift) => shift.status === "flagged" && shift.clockOutAt === null);
  const flaggedCount = flaggedOpen.length;
  const firstFlagged = flaggedOpen[0];
  const totalHours = shifts
    .filter((shift) => shift.clockOutAt === null)
    .reduce((sum, shift) => sum + shift.regularHours + shift.otHours + shift.dtHours, 0);

  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 14);
  const sheetRows = getMockTimesheetRows({
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  });
  const pendingPayrollRows = sheetRows.filter((r) => !r.payrollApprovedAt);
  const pendingPayrollCount = pendingPayrollRows.length;
  const payrollPreviewRow = pendingPayrollRows.sort((a, b) =>
    a.clockInAt < b.clockInAt ? -1 : a.clockInAt > b.clockInAt ? 1 : 0,
  )[0];
  const payrollPreview =
    payrollPreviewRow !== undefined
      ? `${payrollPreviewRow.employeeName} · ${payrollPreviewRow.storeName} · earliest unapproved in range`
      : undefined;

  const flaggedPreview =
    flaggedCount > 0 && firstFlagged
      ? `${firstFlagged.employeeName} · ${firstFlagged.storeName} · open flagged shift`
      : undefined;

  return [
    {
      key: "pending_approvals",
      label: "Pending payroll approval",
      value: String(pendingPayrollCount),
      change: "Closed shifts from the last 14 days not yet marked approved on Timesheets",
      tone: "warning",
      preview: payrollPreview,
      ctaHref: "/timesheets",
      ctaLabel: "Open timesheets",
    },
    {
      key: "flagged_short_entries",
      label: "Flagged entries",
      value: String(flaggedCount),
      change: "Needs a closer look",
      tone: "danger",
      preview: flaggedPreview,
      ctaHref: "/time-clock",
      ctaLabel: "Open time clock",
    },
    {
      key: "clocked_in",
      label: "Currently clocked in",
      value: String(activeCount),
      change: "Clocked in or on break right now",
      tone: "primary",
      ctaHref: "/time-clock",
      ctaLabel: "Open time clock",
    },
    {
      key: "total_hours_today",
      label: "Total hours today",
      value: Intl.NumberFormat("en-US").format(Math.round(totalHours * 100) / 100),
      change: "Clocked in today (UTC day); includes people who already clocked out",
      tone: "success",
      ctaHref: "/timesheets",
      ctaLabel: "Open timesheets",
    },
    {
      key: "profile_gaps",
      label: "Profile gaps",
      value: "2",
      change: "Active employees missing a store assignment or hourly rate in their profile",
      tone: "warning",
      preview: "Ronald Richards · +1 more · missing store or pay rate",
      ctaHref: "/employees",
      ctaLabel: "Open employees",
    },
    {
      key: "active_stores",
      label: "Active locations",
      value: String(stores.length),
      change: "Stores available for assignments and time rules",
      tone: "primary",
      ctaHref: "/settings",
      ctaLabel: "Time rules",
    },
    {
      key: "overtime_hours_7d",
      label: "OT hours (7d)",
      value: Intl.NumberFormat("en-US").format(12.5),
      change: "Overtime hours recorded on shifts clocked in during the last 7 UTC days",
      tone: "accent",
      preview: "12.5h OT · 3 shifts in last 7 days",
      ctaHref: "/reports?focus=labor",
      ctaLabel: "Labor report",
    },
  ];
}

export function getMockDashboardCharts(): DashboardChartData {
  const lineData = [
    { day: "Mon", hours: 176, ot: 22 },
    { day: "Tue", hours: 181, ot: 24 },
    { day: "Wed", hours: 173, ot: 18 },
    { day: "Thu", hours: 189, ot: 27 },
    { day: "Fri", hours: 194, ot: 31 },
    { day: "Sat", hours: 157, ot: 14 },
    { day: "Sun", hours: 145, ot: 11 },
  ];

  const rate = getLaborEstimateBlendedRateUsd();
  const storeHours = new Map<string, number>();
  for (const shift of shifts) {
    const current = storeHours.get(shift.storeName) ?? 0;
    const weighted = weightedHoursForLaborEstimate(shift.regularHours, shift.otHours, shift.dtHours);
    storeHours.set(shift.storeName, Math.round(current + weighted * rate));
  }

  const barData = laborCostsToBarPoints(
    Array.from(storeHours.entries()).map(([store, laborCost]) => ({ store, laborCost })),
  );

  return { lineData, barData };
}

export function getMockHourMix(): HourMixData {
  const relevant = shifts.filter((shift) => shift.clockOutAt === null);
  const regular = relevant.reduce((sum, shift) => sum + shift.regularHours, 0);
  const ot = relevant.reduce((sum, shift) => sum + shift.otHours, 0);
  const dt = relevant.reduce((sum, shift) => sum + shift.dtHours, 0);

  const totalHours = regular + ot + dt;

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    segments: [
      { name: "Regular", value: Math.round(regular * 100) / 100 },
      { name: "OT", value: Math.round(ot * 100) / 100 },
      { name: "DT", value: Math.round(dt * 100) / 100 },
    ],
  };
}

export function getMockHourMixReport(): HourMixReportData {
  const summary = getMockHourMix();
  const active = shifts.filter((shift) => shift.clockOutAt === null);

  const byEmployee: HourMixReportEmployeeRow[] = active
    .map((shift) => ({
      employeeId: shift.employeeId,
      employeeCode: shift.employeeCode,
      employeeName: shift.employeeName,
      storeId: shift.storeId,
      storeName: shift.storeName,
      status: shift.status,
      regularHours: Math.round(shift.regularHours * 100) / 100,
      otHours: Math.round(shift.otHours * 100) / 100,
      dtHours: Math.round(shift.dtHours * 100) / 100,
      totalHours: Math.round((shift.regularHours + shift.otHours + shift.dtHours) * 100) / 100,
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  const storeMap = new Map<string, HourMixReportStoreRow>();
  for (const shift of active) {
    const existing = storeMap.get(shift.storeId) ?? {
      storeId: shift.storeId,
      storeName: shift.storeName,
      regularHours: 0,
      otHours: 0,
      dtHours: 0,
      totalHours: 0,
      activeShiftCount: 0,
    };
    existing.regularHours += shift.regularHours;
    existing.otHours += shift.otHours;
    existing.dtHours += shift.dtHours;
    existing.activeShiftCount += 1;
    storeMap.set(shift.storeId, existing);
  }

  const byStore = Array.from(storeMap.values())
    .map((row) => {
      const regularHours = Math.round(row.regularHours * 100) / 100;
      const otHours = Math.round(row.otHours * 100) / 100;
      const dtHours = Math.round(row.dtHours * 100) / 100;
      return {
        ...row,
        regularHours,
        otHours,
        dtHours,
        totalHours: Math.round((regularHours + otHours + dtHours) * 100) / 100,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);

  return {
    summary,
    generatedAt: new Date().toISOString(),
    scopeDescription:
      "These totals are for open shifts only (people not clocked out yet). For finished shifts ready for payroll, use Timesheets.",
    byEmployee,
    byStore,
  };
}

export function applyMockClockEvent(input: {
  employeeId: string;
  storeId: string;
  action: "clock_in" | "clock_out" | "break_start" | "break_end";
  notes?: string;
}) {
  const occurredAt = new Date().toISOString();
  const existingActive = shifts.find((shift) => shift.employeeId === input.employeeId && shift.clockOutAt === null);

  if (input.action === "clock_in") {
    if (existingActive) {
      throw new Error("Cannot clock in while an active shift exists.");
    }

    if (!clockInAllowedByScheduleMock(input.employeeId, input.storeId, new Date(occurredAt))) {
      throw new Error(SCHEDULE_CLOCK_IN_WINDOW_MESSAGE);
    }

    shifts.unshift({
      id: nextId("shift"),
      employeeId: input.employeeId,
      employeeCode: findEmployeeCode(input.employeeId),
      employeeName: findEmployeeLabel(input.employeeId),
      storeId: input.storeId,
      storeName: findStoreLabel(input.storeId),
      status: "clocked_in",
      regularHours: 0,
      otHours: 0,
      dtHours: 0,
      clockInAt: occurredAt,
      clockOutAt: null,
      hasOpenBreak: false,
    });
  } else if (input.action === "clock_out") {
    if (!existingActive) {
      throw new Error("Cannot clock out without an active shift.");
    }
    existingActive.clockOutAt = occurredAt;
    existingActive.status = "clocked_out";
    existingActive.hasOpenBreak = false;
  } else if (input.action === "break_start") {
    if (!existingActive) {
      throw new Error("Cannot start break without an active shift.");
    }
    if (existingActive.hasOpenBreak) {
      throw new Error("An active break already exists for this shift.");
    }
    existingActive.status = "on_break";
    existingActive.hasOpenBreak = true;
  } else {
    if (!existingActive) {
      throw new Error("Cannot end break without an active shift.");
    }
    if (!existingActive.hasOpenBreak) {
      throw new Error("Cannot end break because no break is currently active.");
    }
    existingActive.status = "clocked_in";
    existingActive.hasOpenBreak = false;
  }

  const eventId = nextId("event");
  events.unshift({
    id: eventId,
    employeeId: input.employeeId,
    employeeName: findEmployeeLabel(input.employeeId),
    storeId: input.storeId,
    storeName: findStoreLabel(input.storeId),
    action: "admin_manual",
    occurredAt,
    notes: input.notes,
  });

  return { eventId };
}

const SCHEDULE_CLOCK_IN_WINDOW_MESSAGE =
  "Clock-in is only allowed from 5 minutes before your scheduled shift start until the shift ends";

/** Matches SQL: if no nearby scheduled shift, allow; else require punch in [start−5m, end). */
function clockInAllowedByScheduleMock(employeeId: string, storeId: string, at: Date): boolean {
  const atMs = at.getTime();
  const all = getMockScheduledShifts();
  const candidates = all.filter(
    (s) =>
      s.employeeId === employeeId &&
      s.storeId === storeId &&
      new Date(s.endAt).getTime() > atMs - 60 * 60 * 1000 &&
      new Date(s.startAt).getTime() < atMs + 24 * 60 * 60 * 1000,
  );
  if (candidates.length === 0) return true;
  return candidates.some(
    (s) =>
      atMs >= new Date(s.startAt).getTime() - 5 * 60 * 1000 && atMs < new Date(s.endAt).getTime(),
  );
}

const mockTimesheetRows: TimesheetRow[] = [
  {
    id: "ts-mock-001",
    employeeId: employees[3]!.id,
    employeeName: employees[3]!.label,
    employeeCode: "EMP-1088",
    storeId: stores[3]!.id,
    storeName: stores[3]!.label,
    clockInAt: daysAgo(1, 8),
    clockOutAt: daysAgo(1, 16),
    status: "clocked_out",
    regularHours: 7.5,
    otHours: 0,
    dtHours: 0,
  },
  {
    id: "ts-mock-002",
    employeeId: employees[0]!.id,
    employeeName: employees[0]!.label,
    employeeCode: "EMP-1007",
    storeId: stores[0]!.id,
    storeName: stores[0]!.label,
    clockInAt: daysAgo(2, 9),
    clockOutAt: daysAgo(2, 17),
    status: "clocked_out",
    regularHours: 7.25,
    otHours: 0.25,
    dtHours: 0,
  },
  {
    id: "ts-mock-003",
    employeeId: employees[1]!.id,
    employeeName: employees[1]!.label,
    employeeCode: "EMP-1023",
    storeId: stores[2]!.id,
    storeName: stores[2]!.label,
    clockInAt: daysAgo(3, 8),
    clockOutAt: daysAgo(3, 14),
    status: "flagged",
    regularHours: 5.75,
    otHours: 0,
    dtHours: 0,
  },
  {
    id: "ts-mock-004",
    employeeId: employees[2]!.id,
    employeeName: employees[2]!.label,
    employeeCode: "EMP-1040",
    storeId: stores[1]!.id,
    storeName: stores[1]!.label,
    clockInAt: daysAgo(5, 7),
    clockOutAt: daysAgo(5, 15),
    status: "clocked_out",
    regularHours: 7.5,
    otHours: 0,
    dtHours: 0,
  },
  {
    id: "ts-mock-005",
    employeeId: employees[4]!.id,
    employeeName: employees[4]!.label,
    employeeCode: "EMP-1069",
    storeId: stores[2]!.id,
    storeName: stores[2]!.label,
    clockInAt: daysAgo(6, 10),
    clockOutAt: daysAgo(6, 19),
    status: "clocked_out",
    regularHours: 8,
    otHours: 1,
    dtHours: 0,
  },
];

const mockPayrollByEntryId = new Map<string, { at: string; byName: string }>();
mockPayrollByEntryId.set("ts-mock-002", { at: daysAgo(1, 12), byName: "Dev Admin" });

const mockPolicyPatchesById = new Map<string, PolicyConfigNumericPatch>();

export function setMockPayrollApproval(entryId: string, approved: boolean, approverName: string) {
  if (approved) {
    mockPayrollByEntryId.set(entryId, { at: new Date().toISOString(), byName: approverName });
  } else {
    mockPayrollByEntryId.delete(entryId);
  }
}

export function patchMockPolicyConfig(id: string, patch: PolicyConfigNumericPatch) {
  mockPolicyPatchesById.set(id, { ...mockPolicyPatchesById.get(id), ...patch });
}

const mockAuditRows: AuditLogRow[] = [
  {
    id: "aud-mock-001",
    createdAt: minutesAgo(22),
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorName: "Dev Admin",
    entityName: "time_events",
    entityId: "e1111111-1111-4111-8111-111111111111",
    action: "clock_in",
    reasonCode: "MANUAL_ENTRY",
    detail: `${employees[0]!.label} · ${stores[0]!.label}`,
  },
  {
    id: "aud-mock-002",
    createdAt: minutesAgo(55),
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorName: "Dev Admin",
    entityName: "time_events",
    entityId: "e2222222-2222-4222-8222-222222222222",
    action: "break_start",
    reasonCode: "MANUAL_ENTRY",
    detail: `${employees[2]!.label} · ${stores[1]!.label}`,
  },
  {
    id: "aud-mock-003",
    createdAt: minutesAgo(120),
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorName: "Dev Admin",
    entityName: "time_events",
    entityId: "e3333333-3333-4333-8333-333333333333",
    action: "admin_manual",
    reasonCode: "MANUAL_ENTRY",
    detail: `${employees[1]!.label} · correction note applied`,
  },
  {
    id: "aud-mock-004",
    createdAt: daysAgo(9, 15),
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorName: "Dev Admin",
    entityName: "users",
    entityId: employees[2]!.id,
    action: "profile_update",
    reasonCode: null,
    detail: "Role review",
  },
  {
    id: "aud-mock-005",
    createdAt: daysAgo(2, 11),
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorName: "Dev Admin",
    entityName: "time_events",
    entityId: "e4444444-4444-4444-8444-444444444444",
    action: "clock_out",
    reasonCode: "MANUAL_ENTRY",
    detail: `${employees[4]!.label} · ${stores[2]!.label}`,
  },
];

export function getMockTimesheetRows(filters?: { storeId?: string; from?: string; to?: string }): TimesheetRow[] {
  let rows = [...mockTimesheetRows];
  if (filters?.storeId) {
    rows = rows.filter((row) => row.storeId === filters.storeId);
  }
  if (filters?.from) {
    const fromT = new Date(filters.from).getTime();
    rows = rows.filter((row) => new Date(row.clockInAt).getTime() >= fromT);
  }
  if (filters?.to) {
    const toT = new Date(filters.to).getTime() + 86_400_000;
    rows = rows.filter((row) => new Date(row.clockInAt).getTime() < toT);
  }
  const merged = rows.map((row) => {
    const p = mockPayrollByEntryId.get(row.id);
    return {
      ...row,
      payrollApprovedAt: p?.at ?? null,
      payrollApprovedByName: p?.byName ?? null,
    };
  });
  return merged.sort((a, b) => (a.clockInAt < b.clockInAt ? 1 : -1));
}

export function getMockAuditLog(filters?: AuditLogFilters): AuditLogRow[] {
  let rows = [...mockAuditRows];
  if (filters?.from) {
    const fromT = new Date(`${filters.from}T00:00:00.000Z`).getTime();
    rows = rows.filter((row) => new Date(row.createdAt).getTime() >= fromT);
  }
  if (filters?.to) {
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const toT = end.getTime();
    rows = rows.filter((row) => new Date(row.createdAt).getTime() < toT);
  }
  if (filters?.entityName?.trim()) {
    const q = filters.entityName.trim().toLowerCase();
    rows = rows.filter((row) => row.entityName.toLowerCase().includes(q));
  }
  if (filters?.action?.trim()) {
    const q = filters.action.trim().toLowerCase();
    rows = rows.filter((row) => row.action.toLowerCase().includes(q));
  }
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getMockPolicyConfigs(): PolicyConfigRow[] {
  return stores.map((store) => {
    const id = `pol-mock-${store.id.slice(0, 8)}`;
    const base: PolicyConfigRow = {
      id,
      storeId: store.id,
      storeName: store.label,
      overtimeDailyThreshold: 8,
      doubleTimeDailyThreshold: 12,
      overtimeWeeklyThreshold: 40,
      autoClockOutHours: 12,
      roundingMode: "none",
    };
    const patch = mockPolicyPatchesById.get(id);
    return patch ? { ...base, ...patch } : base;
  });
}

const mockPtoRequests: PtoRequestRow[] = [
  {
    id: "pto-mock-001",
    employeeId: employees[0]!.id,
    employeeName: employees[0]!.label,
    employeeCode: "EMP-1007",
    storeId: stores[0]!.id,
    storeName: stores[0]!.label,
    requestType: "vacation",
    startDate: daysFromNow(5, 12).slice(0, 10),
    endDate: daysFromNow(7, 12).slice(0, 10),
    note: "Family trip",
    status: "pending",
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    managerNote: null,
    createdAt: minutesAgo(120),
    updatedAt: minutesAgo(120),
  },
  {
    id: "pto-mock-002",
    employeeId: employees[1]!.id,
    employeeName: employees[1]!.label,
    employeeCode: "EMP-1023",
    storeId: stores[2]!.id,
    storeName: stores[2]!.label,
    requestType: "sick",
    startDate: daysAgo(2, 12).slice(0, 10),
    endDate: daysAgo(2, 12).slice(0, 10),
    note: null,
    status: "approved",
    reviewedById: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reviewedByName: "Dev Admin",
    reviewedAt: daysAgo(1, 10),
    managerNote: "Feel better",
    createdAt: daysAgo(3, 9),
    updatedAt: daysAgo(1, 10),
  },
];

const mockScheduledShifts: ScheduledShiftRow[] = (() => {
  const s = new Date(daysFromNow(1, 9));
  const e = new Date(daysFromNow(1, 17));
  return [
    {
      id: "sch-mock-001",
      storeId: stores[0]!.id,
      storeName: stores[0]!.label,
      employeeId: employees[0]!.id,
      employeeName: employees[0]!.label,
      employeeCode: "EMP-1007",
      startAt: s.toISOString(),
      endAt: e.toISOString(),
      shiftTemplate: "morning",
      roleLabel: "Cashier",
      notes: null,
      createdAt: daysAgo(1, 15),
      updatedAt: daysAgo(1, 15),
    },
    {
      id: "sch-mock-002",
      storeId: stores[1]!.id,
      storeName: stores[1]!.label,
      employeeId: employees[2]!.id,
      employeeName: employees[2]!.label,
      employeeCode: "EMP-1040",
      startAt: new Date(daysFromNow(2, 14)).toISOString(),
      endAt: new Date(daysFromNow(2, 22)).toISOString(),
      shiftTemplate: "evening",
      roleLabel: "Shift lead",
      notes: "Close",
      createdAt: daysAgo(1, 15),
      updatedAt: daysAgo(1, 15),
    },
  ];
})();

export function getMockPtoRequests(): PtoRequestRow[] {
  return [...mockPtoRequests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function appendMockPtoRequest(row: PtoRequestRow) {
  mockPtoRequests.unshift(row);
  return row.id;
}

export function patchMockPtoRequest(
  id: string,
  patch: Partial<
    Pick<PtoRequestRow, "status" | "managerNote" | "reviewedById" | "reviewedByName" | "reviewedAt" | "updatedAt">
  >,
) {
  const idx = mockPtoRequests.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("PTO request not found");
  const cur = mockPtoRequests[idx]!;
  mockPtoRequests[idx] = {
    ...cur,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}

export function getMockScheduledShifts(filters?: { storeId?: string; from?: string; to?: string }): ScheduledShiftRow[] {
  let list = [...mockScheduledShifts];
  if (filters?.storeId) {
    list = list.filter((r) => r.storeId === filters.storeId);
  }
  if (filters?.from) {
    const fromT = new Date(`${filters.from}T00:00:00.000Z`).getTime();
    list = list.filter((r) => new Date(r.endAt).getTime() > fromT);
  }
  if (filters?.to) {
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const toT = end.getTime();
    list = list.filter((r) => new Date(r.startAt).getTime() < toT);
  }
  return list.sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
}

export function appendMockScheduledShift(row: ScheduledShiftRow) {
  mockScheduledShifts.push(row);
  return row.id;
}

export function deleteMockScheduledShift(id: string) {
  const idx = mockScheduledShifts.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Shift not found");
  mockScheduledShifts.splice(idx, 1);
}
