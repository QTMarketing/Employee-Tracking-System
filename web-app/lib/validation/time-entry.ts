import { z } from "zod";

export const timeEntrySchema = z.object({
  employeeId: z.uuid("Employee is required"),
  action: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  storeId: z.uuid("Store is required"),
  notes: z.string().max(240, "Notes must be under 240 characters").optional(),
});

export type TimeEntryForm = z.infer<typeof timeEntrySchema>;
