-- OttoLog Migration C — Analytics taxonomy (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Taxonomy analytics + Recommended Build Order step 3
--
-- User-owned only (no global sentinels):
--   analytics_primary_groups  — singular reporting bucket (primary_group_id)
--   analytics_tags            — free-form filters (via analytics_tag_links)
--
-- analytics_tag_links ships in sql/006_exercise_templates.sql (needs exercise_templates FK).

create table if not exists public.analytics_primary_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique name per owner (case-insensitive), active rows only
create unique index if not exists analytics_primary_groups_user_name_unique
  on public.analytics_primary_groups (user_id, lower(name))
  where archived_at is null;

create unique index if not exists analytics_tags_user_name_unique
  on public.analytics_tags (user_id, lower(name))
  where archived_at is null;

create index if not exists analytics_primary_groups_user_id_idx
  on public.analytics_primary_groups (user_id);

create index if not exists analytics_tags_user_id_idx
  on public.analytics_tags (user_id);

-- RLS

alter table public.analytics_primary_groups enable row level security;
alter table public.analytics_tags enable row level security;

drop policy if exists "analytics_primary_groups_select_own" on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_insert_own" on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_update_own" on public.analytics_primary_groups;
drop policy if exists "analytics_primary_groups_delete_own" on public.analytics_primary_groups;

drop policy if exists "analytics_tags_select_own" on public.analytics_tags;
drop policy if exists "analytics_tags_insert_own" on public.analytics_tags;
drop policy if exists "analytics_tags_update_own" on public.analytics_tags;
drop policy if exists "analytics_tags_delete_own" on public.analytics_tags;

create policy "analytics_primary_groups_select_own"
  on public.analytics_primary_groups for select
  to authenticated
  using (user_id = auth.uid());

create policy "analytics_primary_groups_insert_own"
  on public.analytics_primary_groups for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "analytics_primary_groups_update_own"
  on public.analytics_primary_groups for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "analytics_primary_groups_delete_own"
  on public.analytics_primary_groups for delete
  to authenticated
  using (user_id = auth.uid());

create policy "analytics_tags_select_own"
  on public.analytics_tags for select
  to authenticated
  using (user_id = auth.uid());

create policy "analytics_tags_insert_own"
  on public.analytics_tags for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "analytics_tags_update_own"
  on public.analytics_tags for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "analytics_tags_delete_own"
  on public.analytics_tags for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.analytics_primary_groups to authenticated;
grant select, insert, update, delete on public.analytics_tags to authenticated;

notify pgrst, 'reload schema';
