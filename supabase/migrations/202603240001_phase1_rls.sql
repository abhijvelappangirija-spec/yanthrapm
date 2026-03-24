-- Phase 1 security foundation: ownership indexes + row level security
-- Apply this in Supabase after the base tables from README.md exist.

begin;

create or replace function public.is_current_user(target_user_id text)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null and auth.uid()::text = target_user_id
$$;

create index if not exists idx_brds_user_id_created_at
  on public.brds (user_id, created_at desc);

create index if not exists idx_projects_user_id_updated_at
  on public.projects (user_id, updated_at desc);

create index if not exists idx_sprints_user_id_created_at
  on public.sprints (user_id, created_at desc);

create index if not exists idx_sprints_brd_id
  on public.sprints (brd_id);

create index if not exists idx_technical_context_user_id_brd_id
  on public.technical_context (user_id, brd_id);

alter table public.brds enable row level security;
alter table public.projects enable row level security;
alter table public.sprints enable row level security;
alter table public.technical_context enable row level security;

alter table public.brds force row level security;
alter table public.projects force row level security;
alter table public.sprints force row level security;
alter table public.technical_context force row level security;

drop policy if exists brds_select_own on public.brds;
create policy brds_select_own
  on public.brds
  for select
  to authenticated
  using (public.is_current_user(user_id));

drop policy if exists brds_insert_own on public.brds;
create policy brds_insert_own
  on public.brds
  for insert
  to authenticated
  with check (public.is_current_user(user_id));

drop policy if exists brds_update_own on public.brds;
create policy brds_update_own
  on public.brds
  for update
  to authenticated
  using (public.is_current_user(user_id))
  with check (public.is_current_user(user_id));

drop policy if exists brds_delete_own on public.brds;
create policy brds_delete_own
  on public.brds
  for delete
  to authenticated
  using (public.is_current_user(user_id));

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
  on public.projects
  for select
  to authenticated
  using (public.is_current_user(user_id));

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
  on public.projects
  for insert
  to authenticated
  with check (public.is_current_user(user_id));

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
  on public.projects
  for update
  to authenticated
  using (public.is_current_user(user_id))
  with check (public.is_current_user(user_id));

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
  on public.projects
  for delete
  to authenticated
  using (public.is_current_user(user_id));

drop policy if exists sprints_select_own on public.sprints;
create policy sprints_select_own
  on public.sprints
  for select
  to authenticated
  using (
    public.is_current_user(user_id)
    and (
      brd_id is null
      or exists (
        select 1
        from public.brds b
        where b.id = sprints.brd_id
          and public.is_current_user(b.user_id)
      )
    )
  );

drop policy if exists sprints_insert_own on public.sprints;
create policy sprints_insert_own
  on public.sprints
  for insert
  to authenticated
  with check (
    public.is_current_user(user_id)
    and (
      brd_id is null
      or exists (
        select 1
        from public.brds b
        where b.id = sprints.brd_id
          and public.is_current_user(b.user_id)
      )
    )
  );

drop policy if exists sprints_update_own on public.sprints;
create policy sprints_update_own
  on public.sprints
  for update
  to authenticated
  using (
    public.is_current_user(user_id)
    and (
      brd_id is null
      or exists (
        select 1
        from public.brds b
        where b.id = sprints.brd_id
          and public.is_current_user(b.user_id)
      )
    )
  )
  with check (
    public.is_current_user(user_id)
    and (
      brd_id is null
      or exists (
        select 1
        from public.brds b
        where b.id = sprints.brd_id
          and public.is_current_user(b.user_id)
      )
    )
  );

drop policy if exists sprints_delete_own on public.sprints;
create policy sprints_delete_own
  on public.sprints
  for delete
  to authenticated
  using (public.is_current_user(user_id));

drop policy if exists technical_context_select_own on public.technical_context;
create policy technical_context_select_own
  on public.technical_context
  for select
  to authenticated
  using (
    public.is_current_user(user_id)
    and exists (
      select 1
      from public.brds b
      where b.id = technical_context.brd_id
        and public.is_current_user(b.user_id)
    )
  );

drop policy if exists technical_context_insert_own on public.technical_context;
create policy technical_context_insert_own
  on public.technical_context
  for insert
  to authenticated
  with check (
    public.is_current_user(user_id)
    and exists (
      select 1
      from public.brds b
      where b.id = technical_context.brd_id
        and public.is_current_user(b.user_id)
    )
  );

drop policy if exists technical_context_update_own on public.technical_context;
create policy technical_context_update_own
  on public.technical_context
  for update
  to authenticated
  using (
    public.is_current_user(user_id)
    and exists (
      select 1
      from public.brds b
      where b.id = technical_context.brd_id
        and public.is_current_user(b.user_id)
    )
  )
  with check (
    public.is_current_user(user_id)
    and exists (
      select 1
      from public.brds b
      where b.id = technical_context.brd_id
        and public.is_current_user(b.user_id)
    )
  );

drop policy if exists technical_context_delete_own on public.technical_context;
create policy technical_context_delete_own
  on public.technical_context
  for delete
  to authenticated
  using (public.is_current_user(user_id));

grant select, insert, update, delete on public.brds to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.sprints to authenticated;
grant select, insert, update, delete on public.technical_context to authenticated;

commit;
