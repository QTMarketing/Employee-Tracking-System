/**
 * Shared class strings for dashboard data tables so Overview, Directory, Time clock, etc. read as one system.
 */
export const dataTable = {
  /** Scroll + inset border around the grid (inside a Card). */
  shell: "overflow-auto rounded-xl border border-[var(--border)]",
  table: "w-full text-left text-sm",
  thead: "bg-[var(--surface-soft)] text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]",
  th: "px-4 py-3 text-left align-middle",
  tbody: "divide-y divide-[var(--border)]",
  td: "px-4 py-3 align-middle text-[var(--text-primary)]",
  tdMuted: "px-4 py-3 align-middle text-[var(--text-secondary)]",
} as const;
