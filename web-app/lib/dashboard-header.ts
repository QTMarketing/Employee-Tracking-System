/**
 * Top bar title + subtitle for the current pathname (longest matching prefix wins).
 */
export function getDashboardHeader(pathname: string): { title: string; subtitle: string } {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  const entries: { prefix: string; title: string; subtitle: string }[] = [
    {
      prefix: "/schedules",
      title: "Schedules",
      subtitle: "Planned shifts by store—templates, coverage, and manager edits.",
    },
    {
      prefix: "/pto",
      title: "PTO & time off",
      subtitle: "Request time off and approve or deny team requests for your locations.",
    },
    {
      prefix: "/reports",
      title: "Reports",
      subtitle: "Hour mix and labor-by-store views from the same clock data and hour rules.",
    },
    {
      prefix: "/settings",
      title: "Settings",
      subtitle: "Overtime, rounding, and policies that determine how hours are calculated.",
    },
    {
      prefix: "/audit-log",
      title: "Audit log",
      subtitle: "Record of who changed time and employee data, and when.",
    },
    {
      prefix: "/timesheets",
      title: "Timesheets",
      subtitle: "Closed shifts with calculated hours—review and approve before payroll.",
    },
    {
      prefix: "/employees",
      title: "Employees",
      subtitle: "Who works here and which locations they belong to.",
    },
    {
      prefix: "/time-clock",
      title: "Time clock",
      subtitle: "Record clock in, breaks, and clock out—hours calculate from your location rules.",
    },
    {
      prefix: "/overview",
      title: "Operational overview",
      subtitle: "Real-time workforce metrics, labor trends, and open shifts for your locations.",
    },
  ];

  const sorted = [...entries].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return { title: entry.title, subtitle: entry.subtitle };
    }
  }

  if (normalized === "/" || normalized === "") {
    return {
      title: "Operational overview",
      subtitle: "Real-time workforce metrics, labor trends, and open shifts for your locations.",
    };
  }

  return {
    title: "Dashboard",
    subtitle: "Clock in and out, calculate hours, and manage your workforce.",
  };
}
