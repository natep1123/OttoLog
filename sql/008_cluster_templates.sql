-- OttoLog Migration F — Cluster templates (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Templates + Recommended Build Order step 5
--
-- Requires: 001_users (public.users)
--
-- Standalone cluster blueprints. content jsonb holds notes/duration/items[];
-- name + cluster_type are columns for listing and uniqueness. Active names
-- unique per user (case-insensitive), same pattern as sql/007.

create table if not exists public.cluster_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  cluster_type text not null,
  content jsonb not null default '{"notes":null,"track_duration":false,"duration":null,"items":[]}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cluster_templates_type_check check (
    cluster_type in ('superset', 'circuit')
  )
);

create index if not exists cluster_templates_user_id_idx
  on public.cluster_templates (user_id);

create index if not exists cluster_templates_user_updated_idx
  on public.cluster_templates (user_id, updated_at desc);

create unique index if not exists cluster_templates_user_name_unique
  on public.cluster_templates (user_id, lower(name))
  where archived_at is null;

-- RLS

alter table public.cluster_templates enable row level security;

drop policy if exists "cluster_templates_select_own" on public.cluster_templates;
drop policy if exists "cluster_templates_insert_own" on public.cluster_templates;
drop policy if exists "cluster_templates_update_own" on public.cluster_templates;
drop policy if exists "cluster_templates_delete_own" on public.cluster_templates;

create policy "cluster_templates_select_own"
  on public.cluster_templates for select
  to authenticated
  using (user_id = auth.uid());

create policy "cluster_templates_insert_own"
  on public.cluster_templates for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "cluster_templates_update_own"
  on public.cluster_templates for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cluster_templates_delete_own"
  on public.cluster_templates for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.cluster_templates to authenticated;

notify pgrst, 'reload schema';
