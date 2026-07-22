-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Analytics taxonomy: primary groups (+ category), variations (analytics_tags),
-- muscle groups, soft PG→variation suggestions, seed RPCs.
-- Requires: 001_users
-- Product UI: Variations; table remains analytics_tags.

-- ---------------------------------------------------------------------------
-- analytics_primary_groups (+ category for balance Insights)
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_primary_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category text not null
    check (category in (
      'Push', 'Pull', 'Lower', 'Core', 'Power',
      'Skill', 'Cardio', 'Combat', 'Mobility', 'Wellness'
    )),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_primary_groups_user_name_unique
  on public.analytics_primary_groups (user_id, lower(name))
  where archived_at is null;

create index if not exists analytics_primary_groups_user_id_idx
  on public.analytics_primary_groups (user_id);

create index if not exists analytics_primary_groups_user_category_idx
  on public.analytics_primary_groups (user_id, category)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- analytics_tags (product: Variations)
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_tags_user_name_unique
  on public.analytics_tags (user_id, lower(name))
  where archived_at is null;

create index if not exists analytics_tags_user_id_idx
  on public.analytics_tags (user_id);

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

-- ---------------------------------------------------------------------------
-- Soft PG → variation suggestions (picker only; does not constrain links)
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_primary_group_tag_suggestions (
  primary_group_id uuid not null
    references public.analytics_primary_groups (id) on delete cascade,
  tag_id uuid not null
    references public.analytics_tags (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (primary_group_id, tag_id)
);

create index if not exists analytics_pg_tag_suggestions_group_idx
  on public.analytics_primary_group_tag_suggestions (
    primary_group_id, sort_order
  );

create index if not exists analytics_pg_tag_suggestions_tag_idx
  on public.analytics_primary_group_tag_suggestions (tag_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.analytics_primary_groups enable row level security;
alter table public.analytics_tags enable row level security;
alter table public.analytics_muscle_groups enable row level security;
alter table public.analytics_primary_group_tag_suggestions
  enable row level security;

drop policy if exists "analytics_primary_groups_select_own"
  on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_insert_own"
  on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_update_own"
  on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_delete_own"
  on public.analytics_primary_groups;

create policy "analytics_primary_groups_select_own"
  on public.analytics_primary_groups for select to authenticated
  using (user_id = auth.uid());
create policy "analytics_primary_groups_insert_own"
  on public.analytics_primary_groups for insert to authenticated
  with check (user_id = auth.uid());
create policy "analytics_primary_groups_update_own"
  on public.analytics_primary_groups for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "analytics_primary_groups_delete_own"
  on public.analytics_primary_groups for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "analytics_tags_select_own" on public.analytics_tags;
drop policy if exists "analytics_tags_insert_own" on public.analytics_tags;
drop policy if exists "analytics_tags_update_own" on public.analytics_tags;
drop policy if exists "analytics_tags_delete_own" on public.analytics_tags;

create policy "analytics_tags_select_own"
  on public.analytics_tags for select to authenticated
  using (user_id = auth.uid());
create policy "analytics_tags_insert_own"
  on public.analytics_tags for insert to authenticated
  with check (user_id = auth.uid());
create policy "analytics_tags_update_own"
  on public.analytics_tags for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "analytics_tags_delete_own"
  on public.analytics_tags for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "analytics_muscle_groups_select_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_insert_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_update_own"
  on public.analytics_muscle_groups;
drop policy if exists "analytics_muscle_groups_delete_own"
  on public.analytics_muscle_groups;

create policy "analytics_muscle_groups_select_own"
  on public.analytics_muscle_groups for select to authenticated
  using (user_id = auth.uid());
create policy "analytics_muscle_groups_insert_own"
  on public.analytics_muscle_groups for insert to authenticated
  with check (user_id = auth.uid());
create policy "analytics_muscle_groups_update_own"
  on public.analytics_muscle_groups for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "analytics_muscle_groups_delete_own"
  on public.analytics_muscle_groups for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "analytics_pg_tag_suggestions_select_own"
  on public.analytics_primary_group_tag_suggestions;
drop policy if exists "analytics_pg_tag_suggestions_insert_own"
  on public.analytics_primary_group_tag_suggestions;
drop policy if exists "analytics_pg_tag_suggestions_update_own"
  on public.analytics_primary_group_tag_suggestions;
drop policy if exists "analytics_pg_tag_suggestions_delete_own"
  on public.analytics_primary_group_tag_suggestions;

create policy "analytics_pg_tag_suggestions_select_own"
  on public.analytics_primary_group_tag_suggestions for select
  to authenticated
  using (
    exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );
create policy "analytics_pg_tag_suggestions_insert_own"
  on public.analytics_primary_group_tag_suggestions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "analytics_pg_tag_suggestions_update_own"
  on public.analytics_primary_group_tag_suggestions for update
  to authenticated
  using (
    exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "analytics_pg_tag_suggestions_delete_own"
  on public.analytics_primary_group_tag_suggestions for delete
  to authenticated
  using (
    exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );

grant select, insert, update, delete
  on public.analytics_primary_groups to authenticated;
grant select, insert, update, delete
  on public.analytics_tags to authenticated;
grant select, insert, update, delete
  on public.analytics_muscle_groups to authenticated;
grant select, insert, update, delete
  on public.analytics_primary_group_tag_suggestions to authenticated;

-- ---------------------------------------------------------------------------
-- Seed RPCs
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

-- Stubs: New User Seeds content lands in chat 6 (seed dump). Callable no-ops.

create or replace function public.ensure_default_primary_groups(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_primary_groups: user id required';
  end if;
  -- Intentionally empty until New User Seeds PG catalog is seeded.
  return;
end;
$$;

create or replace function public.ensure_default_analytics_tags(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_analytics_tags: user id required';
  end if;
  -- Intentionally empty until lean ~60 shared variations are seeded.
  return;
end;
$$;

create or replace function public.ensure_default_tools(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_tools: user id required';
  end if;
  -- Intentionally empty until New User Seeds tools (beyond No Tool) are seeded.
  -- No Tool is a global sentinel in 004_taxonomy — never duplicated here.
  return;
end;
$$;

grant execute on function public.ensure_default_muscle_groups(uuid)
  to authenticated;
grant execute on function public.ensure_default_primary_groups(uuid)
  to authenticated;
grant execute on function public.ensure_default_analytics_tags(uuid)
  to authenticated;
grant execute on function public.ensure_default_tools(uuid)
  to authenticated;

notify pgrst, 'reload schema';
