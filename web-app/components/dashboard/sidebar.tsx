"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clock3, FileSpreadsheet, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

const nav = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Time Clock", href: "#", icon: Clock3 },
  { label: "Employees", href: "#", icon: Users },
  { label: "Timesheets", href: "#", icon: FileSpreadsheet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Audit Log", href: "#", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_oklab,var(--sidebar-ink)_16%,transparent)] bg-[var(--sidebar-bg)] px-4 py-6 text-[var(--text-on-dark)]">
      <div className="mb-8 px-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--text-on-dark)_56%,transparent)]">
          Employee Time
        </p>
        <h1 className="mt-1 text-xl font-semibold">Operations Console</h1>
      </div>

      <nav className="space-y-1.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href !== "#" &&
            (item.href === "/overview"
              ? pathname === "/overview" || pathname === "/"
              : pathname.startsWith(item.href));

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[var(--sidebar-active)] text-[var(--text-on-dark)]"
                  : "text-[color-mix(in_oklab,var(--text-on-dark)_76%,transparent)] hover:bg-[var(--sidebar-hover)]"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-[color-mix(in_oklab,var(--sidebar-ink)_18%,transparent)] pt-4">
        <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-[color-mix(in_oklab,var(--text-on-dark)_76%,transparent)] hover:bg-[var(--sidebar-hover)]">
          Settings
        </button>
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-[color-mix(in_oklab,var(--text-on-dark)_76%,transparent)] hover:bg-[var(--sidebar-hover)]"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
