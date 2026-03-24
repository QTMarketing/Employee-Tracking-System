"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchAppEnvironment,
  fetchPolicyConfigs,
  patchPolicyConfig,
  type PolicyConfigPatchBody,
} from "@/lib/api/app-settings";
import { fetchSession } from "@/lib/api/session";
import { queryKeys } from "@/lib/query-keys";
import type { PolicyConfigRow } from "@/lib/types/domain";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function PolicyEditorCard({ row, canEdit }: { row: PolicyConfigRow; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [otDaily, setOtDaily] = useState(String(row.overtimeDailyThreshold));
  const [dtDaily, setDtDaily] = useState(String(row.doubleTimeDailyThreshold));
  const [otWeek, setOtWeek] = useState(String(row.overtimeWeeklyThreshold));
  const [autoOut, setAutoOut] = useState(String(row.autoClockOutHours));
  const [rounding, setRounding] = useState(row.roundingMode);

  const mutation = useMutation({
    mutationFn: (body: PolicyConfigPatchBody) => patchPolicyConfig(row.id, body),
    onSuccess: async () => {
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: queryKeys.policyConfigs });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      overtimeDailyThreshold: Number(otDaily),
      doubleTimeDailyThreshold: Number(dtDaily),
      overtimeWeeklyThreshold: Number(otWeek),
      autoClockOutHours: Number(autoOut),
      roundingMode: rounding,
    };
    if (Object.values(body).some((v) => typeof v === "number" && Number.isNaN(v))) {
      toast.error("Enter valid numbers");
      return;
    }
    mutation.mutate(body);
  }

  return (
    <form
      onSubmit={onSave}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm"
    >
      <SectionHeader
        className="mb-3"
        title={row.storeName}
        description="When overtime and double time start, optional auto clock-out, and how clock times are rounded for this location."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[var(--text-secondary)]">
          <span className="text-xs">Daily overtime after (hours)</span>
          <Input value={otDaily} onChange={(e) => setOtDaily(e.target.value)} type="number" step="0.25" disabled={!canEdit} />
        </label>
        <label className="flex flex-col gap-1 text-[var(--text-secondary)]">
          <span className="text-xs">Daily double time after (hours)</span>
          <Input value={dtDaily} onChange={(e) => setDtDaily(e.target.value)} type="number" step="0.25" disabled={!canEdit} />
        </label>
        <label className="flex flex-col gap-1 text-[var(--text-secondary)]">
          <span className="text-xs">Weekly overtime after (hours)</span>
          <Input value={otWeek} onChange={(e) => setOtWeek(e.target.value)} type="number" step="0.25" disabled={!canEdit} />
        </label>
        <label className="flex flex-col gap-1 text-[var(--text-secondary)]">
          <span className="text-xs">Auto clock-out after (hours)</span>
          <Input value={autoOut} onChange={(e) => setAutoOut(e.target.value)} type="number" step="1" disabled={!canEdit} />
        </label>
        <label className="col-span-full flex flex-col gap-1 text-[var(--text-secondary)]">
          <span className="text-xs">Rounding mode</span>
          <select
            value={rounding}
            onChange={(e) => setRounding(e.target.value)}
            disabled={!canEdit}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="none">No rounding</option>
            <option value="nearest_5">Nearest 5 minutes</option>
            <option value="nearest_6">Nearest 6 minutes</option>
            <option value="nearest_15">Nearest 15 minutes</option>
          </select>
        </label>
      </div>
      {canEdit ? (
        <Button type="submit" className="mt-3" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)]">Only admins can save changes in your live workspace.</p>
      )}
    </form>
  );
}

export function SettingsView() {
  const envQuery = useQuery({
    queryKey: queryKeys.appEnvironment,
    queryFn: fetchAppEnvironment,
  });

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
  });

  const policyQuery = useQuery({
    queryKey: queryKeys.policyConfigs,
    queryFn: fetchPolicyConfigs,
  });

  const isAdmin = sessionQuery.data?.role === "admin";
  const canEditPolicies = isAdmin;

  return (
    <div className="space-y-5">
      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          as="h2"
          title="Workspace info"
          description="Summary of how this app is connected. Passwords and keys stay on the server. Some changes need a restart to take effect."
        />
        {envQuery.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]">
            {envQuery.error instanceof Error ? envQuery.error.message : "Failed to load."}
          </p>
        ) : envQuery.isLoading ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Data</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {envQuery.data?.dataMode === "api" ? "Live data" : "Demo / offline"}
                <span className="ml-2 font-mono text-xs text-[var(--text-muted)]">({envQuery.data?.dataMode})</span>
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Sign-in required</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {envQuery.data?.requireSupabaseAuth ? "Yes" : "No"}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Dev use without sign-in</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {envQuery.data?.allowUnauthenticatedDev ? "Allowed (non-production only)" : "Not allowed"}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Your role</dt>
              <dd className="mt-1 text-sm font-medium capitalize text-[var(--text-primary)]">
                {sessionQuery.isLoading ? "…" : (sessionQuery.data?.role?.replace(/_/g, " ") ?? "—")}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Sign-in service</dt>
              <dd className="mt-1 text-sm text-[var(--text-muted)]">Set on the server; not shown in the browser.</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
        <SectionHeader
          as="h2"
          title="Time rules by location"
          description="How time is calculated at each location. Admins save to the database in production. Demo data may reset when you refresh."
        />
        {policyQuery.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]">
            {policyQuery.error instanceof Error ? policyQuery.error.message : "Failed to load policies."}
          </p>
        ) : policyQuery.isLoading ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (policyQuery.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            No time rules found. Ask an admin to finish setup for your workspace.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(policyQuery.data ?? []).map((row) => (
              <PolicyEditorCard
                key={`${row.id}-${row.overtimeDailyThreshold}-${row.roundingMode}`}
                row={row}
                canEdit={canEditPolicies}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
