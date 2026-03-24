-- PTO requests and scheduled shifts (Phase: scheduling & time off)

create type public.pto_request_type as enum ('vacation', 'sick', 'personal');
create type public.pto_request_status as enum ('pending', 'approved', 'denied', 'cancelled');
create type public.shift_template as enum ('morning', 'evening', 'overnight', 'custom');

create table if not exists public.pto_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete restrict,
  request_type public.pto_request_type not null default 'vacation',
  start_date date not null,
  end_date date not null,
  note text,
  status public.pto_request_status not null default 'pending',
  reviewed_by uuid references public.users (id),
  reviewed_at timestamptz,
  manager_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pto_end_on_or_after_start check (end_date >= start_date)
);

create table if not exists public.scheduled_shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  employee_id uuid not null references public.users (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  shift_template public.shift_template not null default 'custom',
  role_label text,
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_shift_end_after_start check (end_at > start_at)
);

create index if not exists idx_pto_requests_employee on public.pto_requests (employee_id, created_at desc);
create index if not exists idx_pto_requests_store on public.pto_requests (store_id, status);
create index if not exists idx_scheduled_shifts_store_range on public.scheduled_shifts (store_id, start_at);
create index if not exists idx_scheduled_shifts_employee on public.scheduled_shifts (employee_id, start_at);

alter table public.pto_requests enable row level security;
alter table public.scheduled_shifts enable row level security;

-- PTO: read if self, admin, or store scope
create policy pto_requests_select_scope
on public.pto_requests
for select
using (
  employee_id = auth.uid()
  or current_app_role() = 'admin'
  or can_access_store(store_id)
);

-- PTO: employees submit for self; managers/admins can submit for anyone in store
create policy pto_requests_insert_scope
on public.pto_requests
for insert
with check (
  can_access_store(store_id)
  and (
    (employee_id = auth.uid() and current_app_role() = 'employee')
    or current_app_role() in ('admin', 'sub_admin', 'store_manager')
  )
);

-- PTO: employee may only cancel own pending request (not self-approve)
create policy pto_requests_update_employee_cancel
on public.pto_requests
for update
using (employee_id = auth.uid() and status = 'pending')
with check (
  employee_id = auth.uid()
  and status = 'cancelled'
  and reviewed_by is null
  and reviewed_at is null
);

create policy pto_requests_update_manager
on public.pto_requests
for update
using (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and (current_app_role() = 'admin' or can_access_store(store_id))
)
with check (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and (current_app_role() = 'admin' or can_access_store(store_id))
);

-- Scheduled shifts: read if assigned employee, admin, or store scope
create policy scheduled_shifts_select_scope
on public.scheduled_shifts
for select
using (
  employee_id = auth.uid()
  or current_app_role() = 'admin'
  or can_access_store(store_id)
);

-- Scheduled shifts: managers only (employees view-only)
create policy scheduled_shifts_write_manager
on public.scheduled_shifts
for all
using (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and (current_app_role() = 'admin' or can_access_store(store_id))
)
with check (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and (current_app_role() = 'admin' or can_access_store(store_id))
);

grant select, insert, update on public.pto_requests to authenticated;
grant select, insert, update, delete on public.scheduled_shifts to authenticated;
