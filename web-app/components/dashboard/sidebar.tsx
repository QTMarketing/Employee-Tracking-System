"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  FileSpreadsheet,
  LayoutDashboard,
  TreePalm,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const nav = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Schedules", href: "/schedules", icon: CalendarDays },
  { label: "Time clock", href: "/time-clock", icon: Clock3 },
  { label: "Timesheets", href: "/timesheets", icon: FileSpreadsheet },
  { label: "PTO", href: "/pto", icon: TreePalm },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Audit log", href: "/audit-log", icon: ShieldCheck },
];

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/overview") {
    return pathname === "/overview" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  /** When false, hide sign-out (no auth wall — see `lib/auth-gate.ts`). */
  showLogout?: boolean;
};

export function Sidebar({ showLogout = true }: SidebarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto border-r border-[color-mix(in_oklab,var(--sidebar-ink)_22%,transparent)] bg-[var(--sidebar-bg)] px-3 py-6 text-[var(--text-on-dark)] shadow-[2px_0_20px_rgba(0,0,0,0.08)] lg:w-72 lg:px-4">
      <div className="mb-6 shrink-0 px-2 lg:mb-7 lg:px-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--text-on-dark)_48%,transparent)]">
          Workforce
        </p>
        <h1 className="mt-1 text-base font-semibold tracking-tight lg:text-lg">HR System</h1>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-[var(--sidebar-active-soft)] text-[var(--text-on-dark)] shadow-[inset_3px_0_0_0_var(--sidebar-indicator)]"
                  : "text-[color-mix(in_oklab,var(--text-on-dark)_72%,transparent)] hover:bg-[var(--sidebar-hover)]"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} className="opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-2 border-t border-[color-mix(in_oklab,var(--sidebar-ink)_18%,transparent)] pt-4">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
            isRouteActive(pathname, "/settings")
              ? "bg-[var(--sidebar-active-soft)] text-[var(--text-on-dark)] shadow-[inset_3px_0_0_0_var(--sidebar-indicator)]"
              : "text-[color-mix(in_oklab,var(--text-on-dark)_72%,transparent)] hover:bg-[var(--sidebar-hover)]"
          }`}
        >
          <Settings size={16} strokeWidth={1.75} className="opacity-90" />
          Settings
        </Link>
        {showLogout ? (
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-[color-mix(in_oklab,var(--text-on-dark)_72%,transparent)] hover:bg-[var(--sidebar-hover)]"
            >
              Log out
            </button>
          </form>
        ) : null}
      </div>
    </aside>
  );
}
