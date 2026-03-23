import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(34,22,42,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
