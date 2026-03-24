-- Enforce clock-in only from 5 minutes before scheduled shift start through shift end,
-- when scheduled_shifts rows exist in a nearby window. Skipped for admin_manual overrides.

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

    if p_method <> 'admin_manual' then
      if exists (
        select 1
        from scheduled_shifts ss
        where ss.employee_id = p_employee_id
          and ss.store_id = p_store_id
          and ss.end_at > p_occurred_at - interval '1 hour'
          and ss.start_at < p_occurred_at + interval '24 hours'
      ) then
        if not exists (
          select 1
          from scheduled_shifts ss
          where ss.employee_id = p_employee_id
            and ss.store_id = p_store_id
            and p_occurred_at >= ss.start_at - interval '5 minutes'
            and p_occurred_at < ss.end_at
        ) then
          raise exception 'Clock-in is only allowed from 5 minutes before your scheduled shift start until the shift ends';
        end if;
      end if;
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
