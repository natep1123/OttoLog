-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Taxonomy: tools, session/block/sequence labels, sentinels, nest-label seed RPC.
-- Requires: 001_users
--
-- Sentinels (fixed UUIDs; also src/constants/sentinelIds.ts):
--   No Tool    40000000-0000-4000-8000-000000000001
--   Session    40000000-0000-4000-8000-000000000002
--   Block      50000000-0000-4000-8000-000000000001
--   Sequence   60000000-0000-4000-8000-000000000001

-- ---------------------------------------------------------------------------
-- tools
-- ---------------------------------------------------------------------------

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  is_system_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tools_system_default_shape check (
    (is_system_default = true and user_id is null and archived_at is null)
    or
    (is_system_default = false and user_id is not null)
  )
);

create unique index if not exists tools_one_system_default
  on public.tools (is_system_default)
  where is_system_default = true;

create unique index if not exists tools_user_name_unique
  on public.tools (user_id, lower(name))
  where user_id is not null and archived_at is null;

insert into public.tools (id, user_id, name, is_system_default, archived_at)
values (
  '40000000-0000-4000-8000-000000000001',
  null,
  'No Tool',
  true,
  null
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- session_categories (+ is_empty for Rest)
-- ---------------------------------------------------------------------------

create table if not exists public.session_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  is_system_default boolean not null default false,
  is_empty boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_categories_system_default_shape check (
    (is_system_default = true and user_id is null and archived_at is null)
    or
    (is_system_default = false and user_id is not null)
  )
);

create unique index if not exists session_categories_one_system_default
  on public.session_categories (is_system_default)
  where is_system_default = true;

create unique index if not exists session_categories_user_name_unique
  on public.session_categories (user_id, lower(name))
  where user_id is not null and archived_at is null;

insert into public.session_categories (
  id, user_id, name, is_system_default, is_empty, archived_at
)
values (
  '40000000-0000-4000-8000-000000000002',
  null,
  'Session',
  true,
  false,
  null
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- block_labels / cluster_labels
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
  where user_id is not null and archived_at is null;

insert into public.block_labels (id, user_id, name, is_system_default, archived_at)
values (
  '50000000-0000-4000-8000-000000000001',
  null,
  'Block',
  true,
  null
)
on conflict (id) do nothing;

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
  where user_id is not null and archived_at is null;

insert into public.cluster_labels (id, user_id, name, is_system_default, archived_at)
values (
  '60000000-0000-4000-8000-000000000001',
  null,
  'Sequence',
  true,
  null
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS (own rows OR system defaults)
-- ---------------------------------------------------------------------------

alter table public.tools enable row level security;
alter table public.session_categories enable row level security;
alter table public.block_labels enable row level security;
alter table public.cluster_labels enable row level security;

drop policy if exists "tools_select" on public.tools;
drop policy if exists "tools_insert_own" on public.tools;
drop policy if exists "tools_update_own" on public.tools;
drop policy if exists "tools_delete_own" on public.tools;

create policy "tools_select"
  on public.tools for select to authenticated
  using (user_id = auth.uid() or is_system_default = true);
create policy "tools_insert_own"
  on public.tools for insert to authenticated
  with check (user_id = auth.uid() and is_system_default = false);
create policy "tools_update_own"
  on public.tools for update to authenticated
  using (user_id = auth.uid() and is_system_default = false)
  with check (user_id = auth.uid() and is_system_default = false);
create policy "tools_delete_own"
  on public.tools for delete to authenticated
  using (user_id = auth.uid() and is_system_default = false);

drop policy if exists "session_categories_select" on public.session_categories;
drop policy if exists "session_categories_insert_own" on public.session_categories;
drop policy if exists "session_categories_update_own" on public.session_categories;
drop policy if exists "session_categories_delete_own" on public.session_categories;

create policy "session_categories_select"
  on public.session_categories for select to authenticated
  using (user_id = auth.uid() or is_system_default = true);
create policy "session_categories_insert_own"
  on public.session_categories for insert to authenticated
  with check (user_id = auth.uid() and is_system_default = false);
create policy "session_categories_update_own"
  on public.session_categories for update to authenticated
  using (user_id = auth.uid() and is_system_default = false)
  with check (user_id = auth.uid() and is_system_default = false);
create policy "session_categories_delete_own"
  on public.session_categories for delete to authenticated
  using (user_id = auth.uid() and is_system_default = false);

drop policy if exists "block_labels_select" on public.block_labels;
drop policy if exists "block_labels_insert_own" on public.block_labels;
drop policy if exists "block_labels_update_own" on public.block_labels;
drop policy if exists "block_labels_delete_own" on public.block_labels;

create policy "block_labels_select"
  on public.block_labels for select to authenticated
  using (user_id = auth.uid() or is_system_default = true);
create policy "block_labels_insert_own"
  on public.block_labels for insert to authenticated
  with check (user_id = auth.uid() and is_system_default = false);
create policy "block_labels_update_own"
  on public.block_labels for update to authenticated
  using (user_id = auth.uid() and is_system_default = false)
  with check (user_id = auth.uid() and is_system_default = false);
create policy "block_labels_delete_own"
  on public.block_labels for delete to authenticated
  using (user_id = auth.uid() and is_system_default = false);

drop policy if exists "cluster_labels_select" on public.cluster_labels;
drop policy if exists "cluster_labels_insert_own" on public.cluster_labels;
drop policy if exists "cluster_labels_update_own" on public.cluster_labels;
drop policy if exists "cluster_labels_delete_own" on public.cluster_labels;

create policy "cluster_labels_select"
  on public.cluster_labels for select to authenticated
  using (user_id = auth.uid() or is_system_default = true);
create policy "cluster_labels_insert_own"
  on public.cluster_labels for insert to authenticated
  with check (user_id = auth.uid() and is_system_default = false);
create policy "cluster_labels_update_own"
  on public.cluster_labels for update to authenticated
  using (user_id = auth.uid() and is_system_default = false)
  with check (user_id = auth.uid() and is_system_default = false);
create policy "cluster_labels_delete_own"
  on public.cluster_labels for delete to authenticated
  using (user_id = auth.uid() and is_system_default = false);

grant select, insert, update, delete on public.tools to authenticated;
grant select, insert, update, delete on public.session_categories to authenticated;
grant select, insert, update, delete on public.block_labels to authenticated;
grant select, insert, update, delete on public.cluster_labels to authenticated;

-- ---------------------------------------------------------------------------
-- ensure_default_template_labels — New User Seeds nest labels
-- ---------------------------------------------------------------------------

create or replace function public.ensure_default_template_labels(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_template_labels: user id required';
  end if;

  insert into public.session_categories (user_id, name, is_system_default, is_empty)
  select p_user_id, v.name, false, false
  from (values
    ('Cardio'),
    ('Hybrid'),
    ('Martial Arts'),
    ('Mobility'),
    ('Recovery'),
    ('Recreation'),
    ('Strength')
  ) as v(name)
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = lower(v.name)
  );

  insert into public.session_categories (user_id, name, is_system_default, is_empty)
  select p_user_id, 'Rest', false, true
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = 'rest'
  );

  insert into public.block_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Challenge'),
    ('Class'),
    ('Competition'),
    ('Cooldown'),
    ('Main'),
    ('Testing'),
    ('Warmup'),
    ('Wellness')
  ) as v(name)
  where not exists (
    select 1 from public.block_labels bl
    where bl.user_id = p_user_id and lower(bl.name) = lower(v.name)
  );

  insert into public.cluster_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Circuit'),
    ('Superset')
  ) as v(name)
  where not exists (
    select 1 from public.cluster_labels cl
    where cl.user_id = p_user_id and lower(cl.name) = lower(v.name)
  );
end;
$$;

grant execute on function public.ensure_default_template_labels(uuid)
  to authenticated;

notify pgrst, 'reload schema';
