import { AddEmployeeForm } from "@/components/dashboard/add-employee-form";
import { EmployeesRosterView } from "@/components/dashboard/employees-roster-view";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <EmployeesRosterView />

      <section className="space-y-4 border-t border-[var(--border)] pt-8">
        <SectionHeader
          as="h2"
          title="Add a new employee"
          description="Create their login, enter their details, and choose which locations they can use."
        />
        <AddEmployeeForm />
      </section>
    </div>
  );
}
