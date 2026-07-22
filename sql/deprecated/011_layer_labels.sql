-- OttoLog Migration I — Layer labels for Session / Block / Sequence
-- (run in Supabase SQL Editor)
--
-- Requires: 001_users, 004_taxonomy, 006–010 template tables
--
-- Adds:
--   block_labels + cluster_labels (sentinel taxonomy tables)
--   Global nulls: General (block), Standard (sequence; internal cluster table)
--   Per-user seedable defaults via ensure_default_template_labels()
--   block_templates.label_id, cluster_templates.label_id (additive)
--   Nullable template names; uniqueness only for nonblank custom names
--
-- Retains cluster_templates.cluster_type for compatibility (dual-write in app).
-- Mirrored IDs in src/constants/sentinelIds.ts

-- ---------------------------------------------------------------------------
-- 1. Block labels
-- ---------------------------------------------------------------------------

create table if not exists public.block_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  is_system_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint block_labels_system_default_shape check (
    (is_system_default = true and user_id is null and archived_at is null)
    or
    (is_system_default = false and user_id is not null)
  )
);

create unique index if not exists block_labels_one_system_default
  on public.block_labels (is_system_default)
  where is_system_default = true;

create unique index if not exists block_labels_user_name_unique
  on public.block_labels (user_id, lower(name))
  where user_id is not null;

insert into public.block_labels (id, user_id, name, is_system_default, archived_at)
values (
  '50000000-0000-4000-8000-000000000001',
  null,
  'General',
  true,
  null
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Sequence labels (internal cluster_labels table)
-- ---------------------------------------------------------------------------

create table if not exists public.cluster_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  is_system_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cluster_labels_system_default_shape check (
    (is_system_default = true and user_id is null and archived_at is null)
    or
    (is_system_default = false and user_id is not null)
  )
);

create unique index if not exists cluster_labels_one_system_default
  on public.cluster_labels (is_system_default)
  where is_system_default = true;

create unique index if not exists cluster_labels_user_name_unique
  on public.cluster_labels (user_id, lower(name))
  where user_id is not null;

insert into public.cluster_labels (id, user_id, name, is_system_default, archived_at)
values (
  '60000000-0000-4000-8000-000000000001',
  null,
  'Standard',
  true,
  null
)
on conflict (id) do update
set
  name = excluded.name,
  user_id = null,
  is_system_default = true,
  archived_at = null;

-- ---------------------------------------------------------------------------
-- 3. RLS for new label tables
-- ---------------------------------------------------------------------------

alter table public.block_labels enable row level security;
alter table public.cluster_labels enable row level security;

drop policy if exists "block_labels_select" on public.block_labels;
drop policy if exists "block_labels_insert_own" on public.block_labels;
drop policy if exists "block_labels_update_own" on public.block_labels;
drop policy if exists "block_labels_delete_own" on public.block_labels;

drop policy if exists "cluster_labels_select" on public.cluster_labels;
drop policy if exists "cluster_labels_insert_own" on public.cluster_labels;
drop policy if exists "cluster_labels_update_own" on public.cluster_labels;
drop policy if exists "cluster_labels_delete_own" on public.cluster_labels;

create policy "block_labels_select"
  on public.block_labels for select
  to authenticated
  using (user_id = auth.uid() or is_system_default = true);

create policy "cluster_labels_select"
  on public.cluster_labels for select
  to authenticated
  using (user_id = auth.uid() or is_system_default = true);

create policy "block_labels_insert_own"
  on public.block_labels for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "cluster_labels_insert_own"
  on public.cluster_labels for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "block_labels_update_own"
  on public.block_labels for update
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  )
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "cluster_labels_update_own"
  on public.cluster_labels for update
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  )
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "block_labels_delete_own"
  on public.block_labels for delete
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "cluster_labels_delete_own"
  on public.cluster_labels for delete
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  );

grant select, insert, update, delete on public.block_labels to authenticated;
grant select, insert, update, delete on public.cluster_labels to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Template columns: label FKs + nullable names
-- ---------------------------------------------------------------------------

alter table public.block_templates
  add column if not exists label_id uuid references public.block_labels (id);

alter table public.cluster_templates
  add column if not exists label_id uuid references public.cluster_labels (id);

-- Existing blocks → General
update public.block_templates
set label_id = '50000000-0000-4000-8000-000000000001'
where label_id is null;

-- Existing sequences → Standard sentinel
update public.cluster_templates
set label_id = '60000000-0000-4000-8000-000000000001'
where label_id is null;

alter table public.block_templates
  alter column label_id set default '50000000-0000-4000-8000-000000000001';

alter table public.cluster_templates
  alter column label_id set default '60000000-0000-4000-8000-000000000001';

-- Enforce NOT NULL after backfill (safe if column already not null)
do $$
begin
  alter table public.block_templates alter column label_id set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.cluster_templates alter column label_id set not null;
exception
  when others then null;
end $$;

create index if not exists block_templates_label_id_idx
  on public.block_templates (label_id);

create index if not exists cluster_templates_label_id_idx
  on public.cluster_templates (label_id);

-- Nullable names (Name/Brief optional)
alter table public.exercise_templates alter column name drop not null;
alter table public.cluster_templates alter column name drop not null;
alter table public.block_templates alter column name drop not null;
alter table public.session_templates alter column name drop not null;

-- Uniqueness only for nonblank custom names (active rows)
drop index if exists exercise_templates_user_name_unique;
drop index if exists cluster_templates_user_name_unique;
drop index if exists block_templates_user_name_unique;
drop index if exists session_templates_user_name_unique;

create unique index if not exists exercise_templates_user_name_unique
  on public.exercise_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

create unique index if not exists cluster_templates_user_name_unique
  on public.cluster_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

create unique index if not exists block_templates_user_name_unique
  on public.block_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

create unique index if not exists session_templates_user_name_unique
  on public.session_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

-- ---------------------------------------------------------------------------
-- 5. Ensure per-user default labels (lazy + backfill existing users)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_default_template_labels(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_template_labels: user id required';
  end if;

  -- Session labels (session_categories)
  insert into public.session_categories (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Strength'),
    ('Cardio'),
    ('Hybrid'),
    ('Mobility'),
    ('Recovery')
  ) as v(name)
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = lower(v.name)
  );

  -- Block labels
  insert into public.block_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Warmup'),
    ('Workout'),
    ('Cooldown')
  ) as v(name)
  where not exists (
    select 1 from public.block_labels bl
    where bl.user_id = p_user_id and lower(bl.name) = lower(v.name)
  );

  -- Sequence labels (internal cluster_labels table)
  insert into public.cluster_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Superset'),
    ('Circuit')
  ) as v(name)
  where not exists (
    select 1 from public.cluster_labels cl
    where cl.user_id = p_user_id and lower(cl.name) = lower(v.name)
  );

end;
$$;

grant execute on function public.ensure_default_template_labels(uuid) to authenticated;

-- Backfill editable defaults for every existing user
do $$
declare
  r record;
begin
  for r in select id from public.users loop
    perform public.ensure_default_template_labels(r.id);
  end loop;
end $$;

notify pgrst, 'reload schema';
