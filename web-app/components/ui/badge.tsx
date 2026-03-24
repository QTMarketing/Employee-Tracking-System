import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeToneMap = {
  primary: "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
  success: "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-[var(--success)]",
  accent: "bg-[color-mix(in_oklab,var(--info)_16%,transparent)] text-[var(--info)]",
  /** High-visibility: flagged + on-break (same family on muted dashboards). */
  alert:
    "bg-amber-300 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-600/40 [text-shadow:none]",
  neutral: "bg-[var(--surface-soft)] text-[var(--text-secondary)] ring-1 ring-[var(--border)]/80",
};

export function Badge({
  className,
  tone = "primary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeToneMap }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeToneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
