import Link from "next/link";
import { BarChart3, PieChart } from "lucide-react";

import { Card } from "@/components/ui/card";

const items = [
  {
    title: "Hour mix",
    description: "Regular, OT, and DT totals with per-employee and per-store breakdown for active shifts.",
    href: "/reports/hour-mix",
    icon: PieChart,
  },
  {
    title: "Labor by store",
    description: "Compare estimated labor cost across locations from the same dataset as the overview chart.",
    href: "/reports/labor-by-store",
    icon: BarChart3,
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          Payroll-focused summaries and drill-downs. Open a report for full tables and charts.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} className="block h-full">
                <Card className="group flex h-full flex-col border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[color-mix(in_oklab,var(--secondary)_35%,var(--border))] hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--secondary)] group-hover:bg-[color-mix(in_oklab,var(--secondary)_14%,transparent)]">
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-[var(--text-primary)]">{item.title}</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                      <span className="mt-3 inline-flex text-sm font-medium text-[var(--secondary)]">
                        Open report →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
