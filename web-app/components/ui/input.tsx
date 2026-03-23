import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
