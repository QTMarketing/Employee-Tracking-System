# Product Requirements Document: Employee Management Dashboard

This document is the **product source of truth** for the workforce management direction of this app. Technical delivery is tracked in [phase-c.md](./phase-c.md) through [phase-f.md](./phase-f.md), [dev.md](./dev.md), and the implementation snapshot at the end of this file.

---

## 1. Executive Summary

The Employee Management Dashboard is a comprehensive workforce management solution designed to streamline operations across multiple retail or service locations. The primary objective is to provide managers with real-time visibility into employee activities, scheduling, and compliance while offering employees a user-friendly interface for time tracking and professional development. By integrating geofencing, automated overtime alerts, and role-specific training modules, the platform aims to reduce administrative overhead and improve operational accuracy.

---

## 2. User Personas

| Persona | Description | Key responsibilities |
|--------|-------------|----------------------|
| **Store Manager** | Oversees daily operations at one or more locations. | Edit schedules, approve timesheets, monitor store-level data, and manage PTO requests. |
| **Employee** | Front-line staff member (Cashier, Shift Lead, etc.). | Clock in/out, view personal schedules, request time off, and complete training modules. |
| **System Administrator** | High-level user managing global settings. | Configure location geofences, set global overtime rules, and manage job codes. |

---

## 3. Functional Requirements

### 3.1 Employee Profiles and Location Management

The system must maintain a centralized database of employee profiles, each linked to a specific **Store Location** (e.g., Store LP, Store 18, Store 29). Profiles must include:

- **Full name** and contact information.
- **Job title:** Cashier, Shift Lead, Assistant Manager, or Manager.
- **Pay rate:** Integration-ready field for payroll processing.
- **Primary location:** Essential for localized reporting and geofence validation.

### 3.2 Time Clock and Geofencing Rules

To ensure accuracy and prevent time theft, the following rules are mandatory:

- **Location-based clock-in:** Employees must be within a predefined GPS geofence or connected to a specific store network to clock in.
- **Early clock-in prevention:** Restrict clock-ins to no more than 5 minutes before the scheduled shift start.
- **Auto clock-out:** Automatically clock out employees after a set duration of inactivity or at the end of their scheduled shift to avoid missed punches.
- **Job selection:** Require employees to select a specific **job code** (e.g., Kitchen, Stocking) upon clocking in for granular labor cost tracking.

### 3.3 Scheduling and Shift Management

The dashboard will feature a robust scheduling engine supporting:

- **Shift templates:** Predefined blocks for Morning, Evening, and Overnight shifts.
- **Assignment logic:** Shifts assignable by both store location and employee role.
- **Import/export:** Import schedules from external tools (e.g., Connecteam) or export for payroll.

### 3.4 Break and Overtime Compliance

Automated rules must maintain legal and operational compliance:

- **Break requirements:** Configurable paid and unpaid break intervals based on shift length.
- **Overtime logic:** Automatic calculation of overtime for hours exceeding 40 per week (and related daily rules as configured).
- **Real-time alerts:** Immediate notifications to managers when an employee is approaching their overtime threshold.

### 3.5 Permissions and Role-Based Access Control (RBAC)

Access levels must be strictly enforced:

- **Managers:** Edit schedules, approve timesheets, view store-specific performance data.
- **Employees:** Personal time tracking, schedule viewing, and PTO requests.

### 3.6 PTO and Time Off Tracking

Standardized workflow for time-off management:

- **Request types:** Vacation, sick time, and personal leave.
- **Approval workflow:** Notifications to managers for pending requests with one-click approval/denial.

### 3.7 Quiz and Training Modules

- **Role-specific training:** Modules tailored to job titles (e.g., food safety for kitchen staff).
- **Assessment quizzes:** Mandatory quizzes after training to verify comprehension before allowing certain job selections.

---

## 4. UI/UX Design Inspiration

Design philosophy: clarity, efficiency, professional aesthetics. Inspiration from modern SaaS workforce tools and curated reference designs.

### 4.1 Visual Hierarchy and Layout

- **Card-based interface:** Modular cards for key metrics (e.g., who’s in now, pending approvals, weekly labor cost).
- **Sidebar navigation:** Persistent left sidebar, shallow navigation depth.
- **Color palette:** Professional “Trust Blue” and “Growth Green,” with high-contrast alerts for overtime or missed punches.

### 4.2 Design Principles

> A professional dashboard should follow the **3-second rule:** a user should grasp the most critical data points within three seconds.

| Design element | Inspiration | Implementation detail |
|----------------|-------------|------------------------|
| Modular cards | Reference UIs (e.g., Pinterest / Dribbble) | Subtle shadows, rounded corners (~8px). |
| Status indicators | Workforce SaaS patterns | Color-coded dots (e.g., green active, grey off, red alert). |
| Timeline view | Shift-planning tools | Horizontal scrolling timeline for daily shift distribution. |

---

## 5. Technical Considerations

- **Geofencing accuracy:** High-precision GPS with fallback to IP-based location verification (validate legally/operationally before relying on IP).
- **Scalability:** Architecture supports adding store locations without performance degradation.
- **Integration:** RESTful APIs for payroll and HRIS exchange.

---

## 6. References

1. UXPin, “Effective Dashboard Design Principles for 2025,” [Online].
2. Pinterest, “Employee Management System UI Design Inspiration,” [Online].

---

## 7. Implementation snapshot (this repo)

This section maps the PRD to **what exists today** in `web-app` so planning stays honest. It is not a commitment order; use it to sequence epics.

| PRD section | In codebase today (high level) | Gap / next work |
|-------------|----------------------------------|-----------------|
| **3.1** Profiles | `users`, `employee_profiles` (code, `hourly_rate`), `user_store_assignments`, primary store | Job title enum, contact fields, pay rate in create/edit flows, reporting by job title |
| **3.2** Time clock & geofence | Clock events, store-scoped punches, policy `auto_clock_out_hours`, OT thresholds in Settings | Geofence/network check, schedule-based early clock-in, job code on punch, auto-out tied to shift/inactivity |
| **3.3** Scheduling | — | Templates, assignments, calendar UI, Connecteam import/export |
| **3.4** Break & OT | `policy_configs` OT/daily/weekly, `break_entries` / break types | Break rules by shift length, manager OT **alerts** (not just calculated hours) |
| **3.5** RBAC | `app_role` + RLS + store scope; payroll approval for managers | Employee portal (own schedule, PTO, clock); admin geofence/job-code admin UI |
| **3.6** PTO | — | Types, balances, requests, approvals, notifications |
| **3.7** Training | — | Content model, quizzes, gating job codes |
| **4** UI | Sidebar, KPI cards, existing tokens | Optional palette pass (Trust Blue / Growth Green), timeline, status-dot language |
| **5** Technical | Next.js API routes, Supabase | Geofence service, payroll/HRIS integration contracts |

**Related docs:** [dev.md](./dev.md), [phase-c.md](./phase-c.md)–[phase-f.md](./phase-f.md), [ui-design-review-prompt.md](./ui-design-review-prompt.md).

When this snapshot drifts, update **§7** in the same PR as the feature work or a doc-only maintenance pass.
