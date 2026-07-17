-- OttoLog Migration B — Taxonomy: tools + session_categories (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Global Sentinels + Taxonomy
--
-- Global sentinels (fixed UUIDs, user_id IS NULL, is_system_default = true):
--   No Tool         40000000-0000-4000-8000-000000000001
--   Uncategorized   40000000-0000-4000-8000-000000000002
--
-- Also mirrored in src/constants/sentinelIds.ts
-- Signup does NOT insert these rows.

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

create table if not exists public.session_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  is_system_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_categories_system_default_shape check (
    (is_system_default = true and user_id is null and archived_at is null)
    or
    (is_system_default = false and user_id is not null)
  )
);

-- At most one system default per table
create unique index if not exists tools_one_system_default
  on public.tools (is_system_default)
  where is_system_default = true;

create unique index if not exists session_categories_one_system_default
  on public.session_categories (is_system_default)
  where is_system_default = true;

-- User vocabulary: unique name per owner (case-insensitive)
create unique index if not exists tools_user_name_unique
  on public.tools (user_id, lower(name))
  where user_id is not null;

create unique index if not exists session_categories_user_name_unique
  on public.session_categories (user_id, lower(name))
  where user_id is not null;

-- Global sentinels (idempotent)

insert into public.tools (id, user_id, name, is_system_default, archived_at)
values (
  '40000000-0000-4000-8000-000000000001',
  null,
  'No Tool',
  true,
  null
)
on conflict (id) do nothing;

insert into public.session_categories (id, user_id, name, is_system_default, archived_at)
values (
  '40000000-0000-4000-8000-000000000002',
  null,
  'Uncategorized',
  true,
  null
)
on conflict (id) do nothing;

-- RLS

alter table public.tools enable row level security;
alter table public.session_categories enable row level security;

drop policy if exists "tools_select" on public.tools;
drop policy if exists "tools_insert_own" on public.tools;
drop policy if exists "tools_update_own" on public.tools;
drop policy if exists "tools_delete_own" on public.tools;

drop policy if exists "session_categories_select" on public.session_categories;
drop policy if exists "session_categories_insert_own" on public.session_categories;
drop policy if exists "session_categories_update_own" on public.session_categories;
drop policy if exists "session_categories_delete_own" on public.session_categories;

-- SELECT: own rows OR system defaults
create policy "tools_select"
  on public.tools for select
  to authenticated
  using (user_id = auth.uid() or is_system_default = true);

create policy "session_categories_select"
  on public.session_categories for select
  to authenticated
  using (user_id = auth.uid() or is_system_default = true);

-- INSERT: own non-default only
create policy "tools_insert_own"
  on public.tools for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "session_categories_insert_own"
  on public.session_categories for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

-- UPDATE: own non-default only (cannot flip into/out of system default)
create policy "tools_update_own"
  on public.tools for update
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  )
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "session_categories_update_own"
  on public.session_categories for update
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  )
  with check (
    user_id = auth.uid()
    and is_system_default = false
  );

-- DELETE: own non-default only (prefer soft-archive in app; hard delete allowed if unused)
create policy "tools_delete_own"
  on public.tools for delete
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  );

create policy "session_categories_delete_own"
  on public.session_categories for delete
  to authenticated
  using (
    user_id = auth.uid()
    and is_system_default = false
  );

grant select, insert, update, delete on public.tools to authenticated;
grant select, insert, update, delete on public.session_categories to authenticated;

notify pgrst, 'reload schema';
