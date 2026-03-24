import type { TimeEntryStatus } from "@/lib/types/domain";

/** Rows that need manager eyes: same visual family (bright alert) in every table. */
export function isActiveShiftAlert(status: TimeEntryStatus): boolean {
  return status === "flagged" || status === "on_break";
}

/** Activity feed / plain strings: "Flagged", "On break", etc. */
export function isShiftStatusLabelAlert(shiftStatus: string): boolean {
  const s = shiftStatus.toLowerCase();
  return s.includes("flagged") || s.includes("break");
}
