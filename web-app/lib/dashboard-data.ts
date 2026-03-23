export type KpiItem = {
  label: string;
  value: string;
  change: string;
  tone: "primary" | "warning" | "success" | "accent";
};

export type TimeEntryRow = {
  id: string;
  employee: string;
  store: string;
  status: "Clocked In" | "On Break" | "Clocked Out" | "Flagged";
  regularHours: number;
  otHours: number;
  dtHours: number;
};

export const kpis: KpiItem[] = [
  { label: "Currently Clocked In", value: "134", change: "+9 vs yesterday", tone: "primary" },
  { label: "Pending Approvals", value: "24", change: "6 urgent", tone: "warning" },
  { label: "Flagged Short Entries", value: "4", change: "-2 this week", tone: "accent" },
  { label: "Total Hours Today", value: "1,218", change: "+4.1%", tone: "success" },
];

export const activity = [
  "Rose Smith clocked in at 8:45 AM",
  "Robert Fox submitted a correction request",
  "Theresa Webb approved 12 timesheets",
  "Ronald Richards missed a clock-out (auto-closed)",
  "Helen Ho adjusted break policy for Downtown Store",
];

export const lineData = [
  { day: "Mon", hours: 176, ot: 22 },
  { day: "Tue", hours: 181, ot: 24 },
  { day: "Wed", hours: 173, ot: 18 },
  { day: "Thu", hours: 189, ot: 27 },
  { day: "Fri", hours: 194, ot: 31 },
  { day: "Sat", hours: 157, ot: 14 },
  { day: "Sun", hours: 145, ot: 11 },
];

export const barData = [
  { store: "Downtown", laborCost: 9400, laborPct: 23 },
  { store: "Northside", laborCost: 7100, laborPct: 21 },
  { store: "Lakeside", laborCost: 8200, laborPct: 25 },
  { store: "West End", laborCost: 6600, laborPct: 19 },
];

export const timeEntries: TimeEntryRow[] = [
  {
    id: "EMP-1007",
    employee: "Rose Smith",
    store: "Downtown",
    status: "Clocked In",
    regularHours: 6.5,
    otHours: 0,
    dtHours: 0,
  },
  {
    id: "EMP-1023",
    employee: "Robert Fox",
    store: "Lakeside",
    status: "Flagged",
    regularHours: 7.2,
    otHours: 0.5,
    dtHours: 0,
  },
  {
    id: "EMP-1040",
    employee: "Theresa Webb",
    store: "Northside",
    status: "On Break",
    regularHours: 5.9,
    otHours: 0,
    dtHours: 0,
  },
  {
    id: "EMP-1058",
    employee: "Ronald Richards",
    store: "Downtown",
    status: "Clocked Out",
    regularHours: 8,
    otHours: 1.25,
    dtHours: 0,
  },
  {
    id: "EMP-1069",
    employee: "Helen Ho",
    store: "West End",
    status: "Clocked In",
    regularHours: 4.1,
    otHours: 0,
    dtHours: 0,
  },
];
