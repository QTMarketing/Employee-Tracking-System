-- Phase 1 baseline schema for PRD-aligned time capture and RBAC.
create extension if not exists "pgcrypto";

create type app_role as enum ('admin', 'sub_admin', 'store_manager', 'employee');
create type user_status as enum ('active', 'inactive', 'terminated');
create type time_event_type as enum ('clock_in', 'clock_out', 'break_start', 'break_end', 'admin_manual');
create type time_entry_status as enum ('clocked_in', 'on_break', 'clocked_out', 'flagged');
create type break_type as enum ('manual_paid', 'manual_unpaid', 'auto_deduct');

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'employee',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_store_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create table if not exists employee_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  employee_code text not null unique,
  pin_hash text,
  hourly_rate numeric(10,2),
  overtime_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists policy_configs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  overtime_daily_threshold numeric(8,2) not null default 8,
  double_time_daily_threshold numeric(8,2) not null default 12,
  overtime_weekly_threshold numeric(8,2) not null default 40,
  auto_clock_out_hours integer not null default 12,
  rounding_mode text not null default 'none',
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id)
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  status time_entry_status not null default 'clocked_in',
  regular_hours numeric(8,2) not null default 0,
  ot_hours numeric(8,2) not null default 0,
  dt_hours numeric(8,2) not null default 0,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists break_entries (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references time_entries(id) on delete cascade,
  break_kind break_type not null default 'manual_unpaid',
  started_at timestamptz not null,
  ended_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists time_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  event_type time_event_type not null,
  occurred_at timestamptz not null default now(),
  method text not null default 'personal',
  reason_code text,
  note text,
  actor_user_id uuid not null references users(id),
  time_entry_id uuid references time_entries(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references users(id),
  entity_name text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  reason_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assignments_user on user_store_assignments(user_id);
create index if not exists idx_assignments_store on user_store_assignments(store_id);
create index if not exists idx_time_entries_employee on time_entries(employee_id, clock_in_at desc);
create index if not exists idx_time_entries_store on time_entries(store_id, clock_in_at desc);
create index if not exists idx_time_entries_active on time_entries(employee_id) where clock_out_at is null;
create index if not exists idx_time_events_occurred on time_events(occurred_at desc);
create index if not exists idx_time_events_store on time_events(store_id, occurred_at desc);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);

create or replace function current_app_role()
returns app_role
language sql
stable
as $$
  select role from users where id = auth.uid()
$$;

create or replace function can_access_store(target_store_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from users u
    where u.id = auth.uid()
      and (
        u.role = 'admin'
        or (
          u.role in ('sub_admin', 'store_manager', 'employee')
          and exists (
            select 1
            from user_store_assignments usa
            where usa.user_id = u.id
              and usa.store_id = target_store_id
          )
        )
      )
  )
$$;

create or replace function apply_clock_event(
  p_employee_id uuid,
  p_store_id uuid,
  p_event_type time_event_type,
  p_occurred_at timestamptz default now(),
  p_method text default 'personal',
  p_reason text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role app_role;
  v_event_id uuid;
  v_time_entry_id uuid;
  v_existing_entry uuid;
  v_existing_store uuid;
  v_open_break uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select role into v_actor_role from users where id = v_actor_id;
  if v_actor_role is null then
    raise exception 'User profile missing';
  end if;

  if v_actor_role = 'employee' and p_employee_id <> v_actor_id then
    raise exception 'Employees can only create their own events';
  end if;

  if v_actor_role <> 'admin' and not can_access_store(p_store_id) then
    raise exception 'Store access denied';
  end if;

  if p_method = 'admin_manual' and coalesce(trim(p_reason), '') = '' then
    raise exception 'Manual actions require a reason code';
  end if;

  select id, store_id
  into v_existing_entry, v_existing_store
  from time_entries
  where employee_id = p_employee_id
    and clock_out_at is null
  order by clock_in_at desc
  limit 1;

  if p_event_type = 'clock_in' then
    if v_existing_entry is not null then
      raise exception 'Cannot clock in while an active shift exists';
    end if;

    insert into time_entries (employee_id, store_id, clock_in_at, status, created_by, updated_by)
    values (p_employee_id, p_store_id, p_occurred_at, 'clocked_in', v_actor_id, v_actor_id)
    returning id into v_time_entry_id;
  elsif p_event_type = 'clock_out' then
    if v_existing_entry is null then
      raise exception 'Cannot clock out without an active shift';
    end if;

    update time_entries
    set clock_out_at = p_occurred_at,
        status = 'clocked_out',
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_existing_entry
    returning id into v_time_entry_id;
  elsif p_event_type = 'break_start' then
    if v_existing_entry is null then
      raise exception 'Cannot start break without an active shift';
    end if;

    select id into v_open_break
    from break_entries
    where time_entry_id = v_existing_entry
      and ended_at is null
    limit 1;

    if v_open_break is not null then
      raise exception 'An active break already exists';
    end if;

    insert into break_entries (time_entry_id, started_at, created_by)
    values (v_existing_entry, p_occurred_at, v_actor_id);

    update time_entries
    set status = 'on_break',
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_existing_entry
    returning id into v_time_entry_id;
  elsif p_event_type = 'break_end' then
    if v_existing_entry is null then
      raise exception 'Cannot end break without an active shift';
    end if;

    select id into v_open_break
    from break_entries
    where time_entry_id = v_existing_entry
      and ended_at is null
    order by started_at desc
    limit 1;

    if v_open_break is null then
      raise exception 'No active break found';
    end if;

    update break_entries
    set ended_at = p_occurred_at,
        updated_at = now()
    where id = v_open_break;

    update time_entries
    set status = 'clocked_in',
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_existing_entry
    returning id into v_time_entry_id;
  else
    if v_existing_entry is null then
      raise exception 'Manual event requires an active or newly created shift context';
    end if;
    v_time_entry_id := v_existing_entry;
  end if;

  insert into time_events (
    employee_id,
    store_id,
    event_type,
    occurred_at,
    method,
    reason_code,
    note,
    actor_user_id,
    time_entry_id
  )
  values (
    p_employee_id,
    p_store_id,
    p_event_type,
    p_occurred_at,
    p_method,
    p_reason,
    p_note,
    v_actor_id,
    v_time_entry_id
  )
  returning id into v_event_id;

  insert into audit_logs (
    actor_user_id,
    entity_name,
    entity_id,
    action,
    new_value,
    reason_code
  )
  values (
    v_actor_id,
    'time_events',
    v_event_id,
    p_event_type::text,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'store_id', p_store_id,
      'method', p_method,
      'note', p_note
    ),
    p_reason
  );

  return v_event_id;
end;
$$;

create or replace view active_time_entries_view
with (security_invoker = true)
as
select
  te.id,
  te.employee_id,
  u.full_name as employee_name,
  ep.employee_code,
  te.store_id,
  s.name as store_name,
  te.status,
  te.regular_hours,
  te.ot_hours,
  te.dt_hours
from time_entries te
join users u on u.id = te.employee_id
left join employee_profiles ep on ep.user_id = te.employee_id
join stores s on s.id = te.store_id
where te.clock_out_at is null;

alter table users enable row level security;
alter table stores enable row level security;
alter table user_store_assignments enable row level security;
alter table employee_profiles enable row level security;
alter table policy_configs enable row level security;
alter table time_entries enable row level security;
alter table break_entries enable row level security;
alter table time_events enable row level security;
alter table audit_logs enable row level security;

create policy users_select_self_or_admin
on users
for select
using (id = auth.uid() or current_app_role() = 'admin');

create policy users_update_self_or_admin
on users
for update
using (id = auth.uid() or current_app_role() = 'admin')
with check (id = auth.uid() or current_app_role() = 'admin');

create policy stores_read_by_scope
on stores
for select
using (can_access_store(id));

create policy assignments_read_by_scope
on user_store_assignments
for select
using (
  current_app_role() = 'admin'
  or user_id = auth.uid()
  or can_access_store(store_id)
);

create policy employee_profiles_read_by_scope
on employee_profiles
for select
using (
  user_id = auth.uid()
  or current_app_role() = 'admin'
  or exists (
    select 1 from user_store_assignments usa
    where usa.user_id = employee_profiles.user_id
      and can_access_store(usa.store_id)
  )
);

create policy policy_configs_read_by_scope
on policy_configs
for select
using (store_id is null and current_app_role() = 'admin' or can_access_store(store_id));

create policy policy_configs_write_admin_only
on policy_configs
for all
using (current_app_role() = 'admin')
with check (current_app_role() = 'admin');

create policy time_entries_read_by_scope
on time_entries
for select
using (
  employee_id = auth.uid()
  or current_app_role() = 'admin'
  or can_access_store(store_id)
);

create policy time_entries_write_manager_scope
on time_entries
for all
using (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and can_access_store(store_id)
)
with check (
  current_app_role() in ('admin', 'sub_admin', 'store_manager')
  and can_access_store(store_id)
);

create policy breaks_read_by_scope
on break_entries
for select
using (
  exists (
    select 1
    from time_entries te
    where te.id = break_entries.time_entry_id
      and (
        te.employee_id = auth.uid()
        or current_app_role() = 'admin'
        or can_access_store(te.store_id)
      )
  )
);

create policy breaks_write_manager_scope
on break_entries
for all
using (
  exists (
    select 1
    from time_entries te
    where te.id = break_entries.time_entry_id
      and current_app_role() in ('admin', 'sub_admin', 'store_manager')
      and can_access_store(te.store_id)
  )
)
with check (
  exists (
    select 1
    from time_entries te
    where te.id = break_entries.time_entry_id
      and current_app_role() in ('admin', 'sub_admin', 'store_manager')
      and can_access_store(te.store_id)
  )
);

create policy time_events_read_by_scope
on time_events
for select
using (
  employee_id = auth.uid()
  or current_app_role() = 'admin'
  or can_access_store(store_id)
);

create policy time_events_insert_by_scope
on time_events
for insert
with check (
  current_app_role() in ('admin', 'sub_admin', 'store_manager', 'employee')
  and (
    employee_id = auth.uid()
    or current_app_role() in ('admin', 'sub_admin', 'store_manager')
  )
  and can_access_store(store_id)
);

create policy audit_logs_read_restricted
on audit_logs
for select
using (current_app_role() in ('admin', 'sub_admin'));

revoke all on audit_logs from authenticated, anon;
grant select on audit_logs to authenticated;

revoke all on function apply_clock_event(uuid, uuid, time_event_type, timestamptz, text, text, text) from public;
grant execute on function apply_clock_event(uuid, uuid, time_event_type, timestamptz, text, text, text) to authenticated;
