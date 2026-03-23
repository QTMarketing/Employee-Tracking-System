drop policy if exists users_select_self_or_admin on users;

create policy users_select_scoped
on users
for select
using (
  id = auth.uid()
  or current_app_role() = 'admin'
  or (
    current_app_role() in ('sub_admin', 'store_manager')
    and exists (
      select 1
      from user_store_assignments my_scope
      join user_store_assignments target_scope
        on target_scope.store_id = my_scope.store_id
      where my_scope.user_id = auth.uid()
        and target_scope.user_id = users.id
    )
  )
);
