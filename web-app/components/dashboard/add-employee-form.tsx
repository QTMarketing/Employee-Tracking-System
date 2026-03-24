"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createEmployeeViaApi } from "@/lib/api/employees-create";
import { fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { fetchSession } from "@/lib/api/session";
import { queryKeys } from "@/lib/query-keys";
import type { EntryOption } from "@/lib/types/domain";

const EMPTY_STORES: EntryOption[] = [];

import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AddEmployeeForm() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [selectedStores, setSelectedStores] = useState<Record<string, boolean>>({});
  const [primaryStoreId, setPrimaryStoreId] = useState("");

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
  });

  const optionsQuery = useQuery({
    queryKey: queryKeys.timeEntryOptions,
    queryFn: fetchTimeEntryOptions,
  });

  const mutation = useMutation({
    mutationFn: createEmployeeViaApi,
    onSuccess: async (data) => {
      toast.success(`Created ${data.fullName} (${data.email})`);
      setEmail("");
      setPassword("");
      setFullName("");
      setEmployeeCode("");
      setSelectedStores({});
      setPrimaryStoreId("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.employeeRoster });
      await queryClient.invalidateQueries({ queryKey: ["time-entry-options"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const isAdmin = sessionQuery.data?.role === "admin";
  const stores = optionsQuery.data?.stores;
  const storeList = stores ?? EMPTY_STORES;

  /** Selected locations in the same order they appear above (not checkbox-click order). */
  const selectedInListOrder = useMemo(
    () => storeList.filter((s) => selectedStores[s.id]),
    [storeList, selectedStores],
  );

  /** Keep the select controlled when the chosen primary was unchecked (submit still uses first in list). */
  const primarySelectValue = useMemo(() => {
    if (!primaryStoreId) {
      return "";
    }
    return selectedInListOrder.some((s) => s.id === primaryStoreId) ? primaryStoreId : "";
  }, [primaryStoreId, selectedInListOrder]);

  function toggleStore(id: string) {
    setSelectedStores((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const storeIds = selectedInListOrder.map((s) => s.id);
    if (storeIds.length === 0) {
      toast.error("Select at least one location");
      return;
    }
    const primary =
      storeIds.length === 1
        ? storeIds[0]!
        : primarySelectValue && storeIds.includes(primarySelectValue)
          ? primarySelectValue
          : storeIds[0]!;
    mutation.mutate({
      email,
      password,
      fullName,
      employeeCode,
      storeIds,
      primaryStoreId: primary,
    });
  }

  if (sessionQuery.isLoading) {
    return (
      <Card className="border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        Checking your permissions…
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
        You can&apos;t add employees with your current role. Ask an admin to create the account or give you admin
        access.
      </Card>
    );
  }

  return (
    <Card className="border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(34,22,42,0.06)]">
      <SectionHeader
        title="Account and locations"
        description="Enter their details, choose where they can clock in, and submit. If it fails, your setup may not allow creating accounts—ask your IT or admin contact."
      />

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Employee code</label>
            <Input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              required
              pattern="[A-Za-z0-9_-]{2,32}"
              title="Use 2–32 characters: letters, numbers, dash, or underscore"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Email (login)</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Locations they work at</p>
          <p className="text-xs text-[var(--text-muted)]">Check every store or site this person can clock in at.</p>
          <div className="flex flex-wrap gap-2">
            {storeList.map((store) => (
              <label
                key={store.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={Boolean(selectedStores[store.id])}
                  onChange={() => toggleStore(store.id)}
                />
                {store.label}
              </label>
            ))}
          </div>
          {storeList.length === 0 ? (
            <p className="text-xs text-[var(--warning)]">No locations available. Check that your admin account has locations assigned.</p>
          ) : null}
        </div>

        {selectedInListOrder.length === 1 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">Primary location: </span>
            {selectedInListOrder[0]!.label}
            <span className="text-[var(--text-muted)]"> — their only selected site.</span>
          </div>
        ) : selectedInListOrder.length > 1 ? (
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]" htmlFor="primary-store">
              Primary location (home store)
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Defaults to the <span className="font-medium text-[var(--text-secondary)]">first location in the row above</span>{" "}
              (left to right). Change it if their main site is different.
            </p>
            <select
              id="primary-store"
              value={primarySelectValue}
              onChange={(e) => setPrimaryStoreId(e.target.value)}
              className="h-10 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="">
                {selectedInListOrder[0]
                  ? `First in list above — ${selectedInListOrder[0].label}`
                  : "Select locations first"}
              </option>
              {selectedInListOrder.slice(1).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create employee"}
        </Button>
      </form>
    </Card>
  );
}
