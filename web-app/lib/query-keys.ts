export const queryKeys = {
  appEnvironment: ["app-environment"] as const,
  auditLog: (filters: { from?: string; to?: string; entityName?: string; action?: string }) =>
    ["audit-log", filters.from ?? "", filters.to ?? "", filters.entityName ?? "", filters.action ?? ""] as const,
  session: ["session"] as const,
  employeeRoster: ["employee-roster"] as const,
  policyConfigs: ["policy-configs"] as const,
  timesheets: (filters: { storeId?: string; from?: string; to?: string }) =>
    ["timesheets", filters.storeId ?? "", filters.from ?? "", filters.to ?? ""] as const,
  timeEntries: ["time-entries"] as const,
  timeEntryOptions: ["time-entry-options"] as const,
  dashboardKpis: ["dashboard-kpis"] as const,
  activityFeed: ["activity-feed"] as const,
  dashboardCharts: ["dashboard-charts"] as const,
  hourMix: ["hour-mix"] as const,
  hourMixReport: ["hour-mix-report"] as const,
  ptoRequests: ["pto-requests"] as const,
  scheduledShifts: (filters: { storeId?: string; from?: string; to?: string }) =>
    ["scheduled-shifts", filters.storeId ?? "", filters.from ?? "", filters.to ?? ""] as const,
};
