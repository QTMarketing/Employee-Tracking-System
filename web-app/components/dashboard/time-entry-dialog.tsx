"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClockEvent, fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";
import { ActiveTimeEntry } from "@/lib/types/domain";
import { type TimeEntryForm, timeEntrySchema } from "@/lib/validation/time-entry";

import { Button } from "@/components/ui/button";

const actions = [
  { value: "clock_in", label: "Clock In" },
  { value: "clock_out", label: "Clock Out" },
  { value: "break_start", label: "Break Start" },
  { value: "break_end", label: "Break End" },
] as const;

type TimeEntryDialogProps = {
  /** Extra classes for the trigger button (e.g. top bar sizing). */
  triggerClassName?: string;
};

export function TimeEntryDialog({ triggerClassName }: TimeEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<TimeEntryForm>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      action: "clock_in",
      employeeId: "",
      storeId: "",
      notes: "",
    },
  });
  const { data: options, isLoading: isLoadingOptions } = useQuery({
    queryKey: queryKeys.timeEntryOptions,
    queryFn: fetchTimeEntryOptions,
  });

  const mutation = useMutation({
    mutationFn: createClockEvent,
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.timeEntries });
      const previousRows = queryClient.getQueryData<ActiveTimeEntry[]>(queryKeys.timeEntries);

      const optimisticRow: ActiveTimeEntry = {
        id: `tmp-${Date.now()}`,
        employeeId: "pending",
        employeeCode: "PENDING",
        employeeName:
          options?.employees.find((employee) => employee.id === values.employeeId)?.label ?? "Pending employee",
        storeId: "pending",
        storeName: options?.stores.find((store) => store.id === values.storeId)?.label ?? "Pending store",
        status:
          values.action === "clock_out"
            ? "clocked_out"
            : values.action === "break_start"
              ? "on_break"
              : values.action === "break_end"
                ? "clocked_in"
                : "clocked_in",
        regularHours: 0,
        otHours: 0,
        dtHours: 0,
      };

      queryClient.setQueryData<ActiveTimeEntry[]>(
        queryKeys.timeEntries,
        (old) => [optimisticRow, ...(old ?? [])].slice(0, 100),
      );

      return { previousRows };
    },
    onError: (error, _values, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(queryKeys.timeEntries, context.previousRows);
      }
      toast.error(error instanceof Error ? error.message : "Could not save. Try again.");
    },
    onSuccess: (_response, values) => {
      const employeeName = options?.employees.find((employee) => employee.id === values.employeeId)?.label ?? "Employee";
      toast.success(`Saved for ${employeeName}`);
      setOpen(false);
      form.reset();
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activityFeed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardKpis }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hourMix }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardCharts }),
      ]);
    },
  });

  const onSubmit = async (values: TimeEntryForm) => {
    await mutation.mutateAsync({
      employeeId: values.employeeId,
      storeId: values.storeId,
      action: values.action,
      notes: values.notes,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className={triggerClassName}>Record time</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[rgba(24,15,32,0.45)] backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">Record time</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">
            Record a clock in, break, or clock out for someone else. Notes are optional.
          </Dialog.Description>

          <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label.Root className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Employee</Label.Root>
              <select
                {...form.register("employeeId")}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select employee</option>
                {(options?.employees ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.employeeId ? (
                <p className="text-xs text-[var(--danger)]">{form.formState.errors.employeeId.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label.Root className="text-xs uppercase tracking-wide text-[var(--text-muted)]">What to record</Label.Root>
                <select
                  {...form.register("action")}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {actions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label.Root className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Location</Label.Root>
                <select
                  {...form.register("storeId")}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select location</option>
                  {(options?.stores ?? []).map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label.Root className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Notes</Label.Root>
              <textarea
                {...form.register("notes")}
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Optional note"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={mutation.isPending || isLoadingOptions}>
                {mutation.isPending ? "Saving…" : isLoadingOptions ? "Loading…" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
