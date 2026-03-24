"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { SectionHeader } from "@/components/dashboard/section-header";
import { HourMixReportView } from "@/components/reports/hour-mix-report-view";
import { LaborByStoreReportView } from "@/components/reports/labor-by-store-report-view";

export function ReportsCombinedView() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const focus = searchParams.get("focus");
    const id =
      focus === "labor" ? "report-labor-by-store" : focus === "hour-mix" ? "report-hour-mix" : null;
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams]);

  return (
    <div className="space-y-14">
      <section id="report-hour-mix" className="scroll-mt-8 space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/40 p-5 ring-1 ring-[color-mix(in_oklab,var(--border)_80%,transparent)]">
          <SectionHeader
            className="mb-6"
            as="h2"
            title="Hour mix"
            description="See how hours split between regular time, overtime, and double time—by person and location."
          />
          <HourMixReportView embedded />
        </div>
      </section>

      <section id="report-labor-by-store" className="scroll-mt-8 space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/40 p-5 ring-1 ring-[color-mix(in_oklab,var(--border)_80%,transparent)]">
          <SectionHeader
            className="mb-6"
            as="h2"
            title="Labor by store"
            description="Compare estimated labor cost across locations to spot spending patterns."
          />
          <LaborByStoreReportView embedded />
        </div>
      </section>
    </div>
  );
}
