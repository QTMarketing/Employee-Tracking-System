"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTimeEntryOptions } from "@/lib/api/time-entries";
import { queryKeys } from "@/lib/query-keys";

/**
 * Store filter affordance for the top bar. Selection is local-only until global scope is wired.
 */
export function StoreScopeSelect() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.timeEntryOptions,
    queryFn: fetchTimeEntryOptions,
  });

  const stores = data?.stores ?? [];

  return (
    <label className="flex min-w-0 items-center gap-3 text-sm text-[var(--text-secondary)]">
      <span className="hidden shrink-0 sm:inline">Store</span>
      <select
        className="h-9 max-w-[160px] cursor-pointer truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:max-w-[200px]"
        defaultValue=""
        disabled={isLoading || stores.length === 0}
        aria-label="Filter by store location"
        title="Location filter will apply to dashboard data in a future update"
      >
        <option value="">All locations</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
