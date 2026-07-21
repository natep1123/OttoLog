-- OttoLog Migration N — Muscle groups (anatomy multiselect)
-- Requires: 005_analytics_taxonomy, 006_exercise_templates, 014_session_logs
--
-- First-class anatomy axis (not tags). Ordered M2M on templates + logs.
-- Seeded defaults via ensure_default_muscle_groups (lazy, idempotent).

-- ---------------------------------------------------------------------------
-- analytics_muscle_groups
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_muscle_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_muscle_groups_user_name_unique
  on public.analytics_muscle_groups (user_id, lower(name))
  where archived_at is null;

create index if not exists analytics_muscle_groups_user_id_idx
  on public.analytics_muscle_groups (user_id);

alter table public.analytics_muscle_groups enable row level security;

drop policy if exists "analytics_muscle_groups_select_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_insert_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_update_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_delete_own"
  on public.analytics_muscle_groups;

create policy "analytics_muscle_groups_select_own"
  on public.analytics_muscle_groups for select
  to authenticated
  using (user_id = auth.uid());

create policy "analytics_muscle_groups_insert_own"
  on public.analytics_muscle_groups for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "analytics_muscle_groups_update_own"
  on public.analytics_muscle_groups for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "analytics_muscle_groups_delete_own"
  on public.analytics_muscle_groups for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete
  on public.analytics_muscle_groups to authenticated;

-- ---------------------------------------------------------------------------
-- Link tables
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_template_muscle_group_links (
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (exercise_template_id, muscle_group_id)
);

create index if not exists exercise_template_mg_links_template_idx
  on public.exercise_template_muscle_group_links (
    exercise_template_id, sort_order
  );

create index if not exists exercise_template_mg_links_group_idx
  on public.exercise_template_muscle_group_links (muscle_group_id);

create table if not exists public.log_item_muscle_group_links (
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (log_item_id, muscle_group_id)
);

create index if not exists log_item_mg_links_item_idx
  on public.log_item_muscle_group_links (log_item_id, sort_order);

create index if not exists log_item_mg_links_group_idx
  on public.log_item_muscle_group_links (muscle_group_id);

create table if not exists public.log_sub_item_muscle_group_links (
  log_sub_item_id uuid not null
    references public.log_sub_items (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (log_sub_item_id, muscle_group_id)
);

create index if not exists log_sub_item_mg_links_sub_idx
  on public.log_sub_item_muscle_group_links (log_sub_item_id, sort_order);

create index if not exists log_sub_item_mg_links_group_idx
  on public.log_sub_item_muscle_group_links (muscle_group_id);

-- RLS for link tables

alter table public.exercise_template_muscle_group_links enable row level security;
alter table public.log_item_muscle_group_links enable row level security;
alter table public.log_sub_item_muscle_group_links enable row level security;

drop policy if exists "exercise_template_mg_links_select_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_insert_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_update_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_delete_own"
  on public.exercise_template_muscle_group_links;

create policy "exercise_template_mg_links_select_own"
  on public.exercise_template_muscle_group_links for select
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

create policy "exercise_template_mg_links_insert_own"
  on public.exercise_template_muscle_group_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_muscle_groups g
      where g.id = muscle_group_id and g.user_id = auth.uid()
    )
  );

create policy "exercise_template_mg_links_update_own"
  on public.exercise_template_muscle_group_links for update
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_muscle_groups g
      where g.id = muscle_group_id and g.user_id = auth.uid()
    )
  );

create policy "exercise_template_mg_links_delete_own"
  on public.exercise_template_muscle_group_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

drop policy if exists "log_item_mg_links_select_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_insert_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_update_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_delete_own"
  on public.log_item_muscle_group_links;

create policy "log_item_mg_links_select_own"
  on public.log_item_muscle_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_insert_own"
  on public.log_item_muscle_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_update_own"
  on public.log_item_muscle_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_delete_own"
  on public.log_item_muscle_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_item_mg_links_select_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_insert_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_update_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_delete_own"
  on public.log_sub_item_muscle_group_links;

create policy "log_sub_item_mg_links_select_own"
  on public.log_sub_item_muscle_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_insert_own"
  on public.log_sub_item_muscle_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_update_own"
  on public.log_sub_item_muscle_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_delete_own"
  on public.log_sub_item_muscle_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete
  on public.exercise_template_muscle_group_links to authenticated;
grant select, insert, update, delete
  on public.log_item_muscle_group_links to authenticated;
grant select, insert, update, delete
  on public.log_sub_item_muscle_group_links to authenticated;

-- ---------------------------------------------------------------------------
-- Seed RPC (A–Z defaults from Label_Library)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_default_muscle_groups(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_muscle_groups: user id required';
  end if;

  insert into public.analytics_muscle_groups (user_id, name)
  select p_user_id, v.name
  from (values
    ('Biceps'),
    ('Calves'),
    ('Chest'),
    ('Core'),
    ('Forearms'),
    ('Hamstrings/Glutes'),
    ('Lats'),
    ('Neck'),
    ('Quads'),
    ('Rear Delts'),
    ('Shoulders'),
    ('Spinal Chain'),
    ('Traps'),
    ('Triceps')
  ) as v(name)
  where not exists (
    select 1 from public.analytics_muscle_groups g
    where g.user_id = p_user_id and lower(g.name) = lower(v.name)
  );
end;
$$;

grant execute on function public.ensure_default_muscle_groups(uuid)
  to authenticated;

notify pgrst, 'reload schema';
