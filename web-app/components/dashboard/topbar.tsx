import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 py-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Overview</h2>
        <p className="text-sm text-[var(--text-secondary)]">Multi-store labor visibility and approvals in one place.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
          <input
            type="text"
            placeholder="Search employee or store"
            className="h-10 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <Button variant="outline">Filter Scope</Button>
      </div>
    </header>
  );
}
