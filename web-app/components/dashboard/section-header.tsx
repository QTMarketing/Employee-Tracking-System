import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  title: string;
  description?: string;
  /** Small label above the title (e.g. category). */
  eyebrow?: string;
  /** Right-aligned actions (links, buttons). */
  actions?: ReactNode;
  /** Inline with the title (badges, status). */
  meta?: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4";
};

/**
 * Consistent title + optional helper copy for dashboard cards and sections.
 */
export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
  as: Comp = "h3",
}: SectionHeaderProps) {
  const titleClass =
    Comp === "h2"
      ? "text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
      : "text-base font-semibold text-[var(--text-primary)]";

  return (
    <header className={cn("space-y-1", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{eyebrow}</p>
          ) : null}
          <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-0.5")}>
            <Comp className={titleClass}>{title}</Comp>
            {meta}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      ) : null}
    </header>
  );
}
