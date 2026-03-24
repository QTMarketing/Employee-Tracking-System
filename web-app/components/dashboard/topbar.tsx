"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getDashboardHeader } from "@/lib/dashboard-header";

import { OperationsRefreshButton } from "@/components/dashboard/operations-refresh-bar";
import { StoreScopeSelect } from "@/components/dashboard/store-scope-select";
import { TimeEntryDialog } from "@/components/dashboard/time-entry-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isOverviewPath(pathname: string): boolean {
  return pathname === "/overview" || pathname === "/" || pathname === "";
}

export function Topbar() {
  const pathname = usePathname() ?? "/overview";
  const { title, subtitle } = getDashboardHeader(pathname);
  const overview = isOverviewPath(pathname);

  const showAddEmployee = overview || pathname === "/employees";
  const addEmployeeVariant = overview ? "outline" : "primary";

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 sm:px-8 sm:py-5">
        <div className="space-y-3">
          {/* Heading + operational toolbar: one band on large screens */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6 lg:gap-8">
            <div className="min-w-0 md:flex-1 md:pr-4">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {subtitle}
              </p>
            </div>

            <div
              className={cn(
                "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-x-5 md:justify-end md:gap-x-6 md:pt-0.5",
                "md:max-w-[min(100%,42rem)]",
                "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
              aria-label="Page actions"
            >
              <div className="flex shrink-0 items-center">
                <StoreScopeSelect />
              </div>
              {showAddEmployee ? (
                <Link
                  href="/employees"
                  className={cn(
                    buttonVariants({ variant: addEmployeeVariant }),
                    "h-9 shrink-0 px-4 text-xs font-semibold whitespace-nowrap sm:text-sm",
                  )}
                >
                  + Add employee
                </Link>
              ) : null}
              {overview ? (
                <>
                  <div className="shrink-0">
                    <OperationsRefreshButton showLastRefresh={false} />
                  </div>
                  <div className="shrink-0 [&_button]:whitespace-nowrap">
                    <TimeEntryDialog triggerClassName="h-9 px-4 text-xs font-semibold sm:text-sm" />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
