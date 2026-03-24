import { Suspense } from "react";

import { ReportsCombinedView } from "@/components/reports/reports-combined-view";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-soft)]" aria-hidden />}
    >
      <ReportsCombinedView />
    </Suspense>
  );
}
