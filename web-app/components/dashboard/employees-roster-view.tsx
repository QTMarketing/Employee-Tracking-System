"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchEmployeeRoster } from "@/lib/api/employees";
import { queryKeys } from "@/lib/query-keys";
import type { EmployeeRosterStoreGroup, RosterEmployee } from "@/lib/types/domain";

import { dataTable } from "@/components/dashboard/data-table-styles";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function statusLabel(status: RosterEmployee["status"]): string {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Terminated";
}

function statusTone(status: RosterEmployee["status"]): "primary" | "warning" | "success" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "warning";
}

function matchesSearch(employee: RosterEmployee, storeName: string, q: string): boolean {
  if (!q) return true;
  const hay = `${employee.fullName} ${employee.employeeCode ?? ""} ${storeName}`.toLowerCase();
  return hay.includes(q);
}

export function EmployeesRosterView() {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.employeeRoster,
    queryFn: fetchEmployeeRoster,
  });

  const filteredGroups: EmployeeRosterStoreGroup[] = useMemo(() => {
    const byStore = data?.byStore;
    if (!byStore) {
      return [];
    }
    return byStore
      .map((group) => ({
        ...group,
        employees: group.employees.filter((employee) => matchesSearch(employee, group.storeName, q)),
      }))
      .filter((group) => group.employees.length > 0 || !q);
  }, [data, q]);

  if (isError) {
    return (
        <Card className="border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
        <p className="font-medium">Could not load the employee list.</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          {error instanceof Error ? error.message : "Refresh the page or sign in again."}
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <SectionHeader
            as="h2"
            title="Directory"
            description="People grouped by work location. Search only hides rows here—it does not change where someone works."
          />
          <p className="text-sm text-[var(--text-secondary)]">
            {isLoading
              ? "Loading…"
              : data
                ? `${data.uniqueEmployeeCount} employee${data.uniqueEmployeeCount === 1 ? "" : "s"} across ${data.byStore.length} location${data.byStore.length === 1 ? "" : "s"}.${isFetching && !isLoading ? " Updating…" : ""}`
                : null}
          </p>
        </div>
        <div className="w-full shrink-0 sm:max-w-xs">
          <label className="sr-only" htmlFor="roster-search">
            Search roster
          </label>
          <Input
            id="roster-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, or store…"
          />
        </div>
      </div>

      {isLoading ? (
        <Card className="border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">Loading…</Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">
          {q ? (
            "No one matches that search. Try another name, code, or store."
          ) : (
            <>
              <p>No employees show up for your locations yet.</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Admins: use <span className="font-medium text-[var(--text-secondary)]">Add a new employee</span> below.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.storeId}
              className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(34,22,42,0.06)]"
            >
              <div className="border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <SectionHeader
                  title={group.storeName}
                  description="People who work at this location for schedules and time tracking."
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {group.employees.length} assigned
                  {q ? " (filtered)" : ""}
                </p>
              </div>
              {group.employees.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--text-secondary)]">No employees assigned to this store.</p>
              ) : (
                <div className={dataTable.shell}>
                  <table className={`${dataTable.table} min-w-[520px] table-fixed border-collapse`}>
                    <thead className={dataTable.thead}>
                      <tr>
                        <th className={`${dataTable.th} w-[30%]`}>Name</th>
                        <th className={`${dataTable.th} w-[18%]`}>Code</th>
                        <th className={`${dataTable.th} w-[22%]`}>Status</th>
                        <th className={`${dataTable.th} w-[30%]`}>At this store</th>
                      </tr>
                    </thead>
                    <tbody className={dataTable.tbody}>
                      {group.employees.map((employee) => (
                        <tr key={`${group.storeId}-${employee.id}`} className="bg-[var(--surface)]">
                          <td className={`${dataTable.td} max-w-0 font-medium`}>
                            <span className="block truncate" title={employee.fullName}>
                              {employee.fullName}
                            </span>
                          </td>
                          <td className={`${dataTable.tdMuted} whitespace-nowrap font-mono text-[13px]`}>
                            {employee.employeeCode ?? "—"}
                          </td>
                          <td className={dataTable.td}>
                            <Badge tone={statusTone(employee.status)} className="whitespace-nowrap">
                              {statusLabel(employee.status)}
                            </Badge>
                          </td>
                          <td className={dataTable.td}>
                            {employee.isPrimaryForStore ? (
                              <Badge tone="primary" className="whitespace-nowrap">
                                Primary
                              </Badge>
                            ) : (
                              <Badge tone="neutral" className="whitespace-nowrap">
                                Also works here
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
