-- OttoLog Migration H — Session templates (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Templates + Recommended Build Order step 5b
--
-- Requires: 001_users, 004_taxonomy (session_categories + Uncategorized)
--
-- Full session blueprints. content jsonb holds an ordered blocks[] tree
-- (each block embeds cluster blobs). category_id never null.

create table if not exists public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  category_id uuid not null references public.session_categories (id),
  content jsonb not null default '{"notes":null,"track_duration":false,"duration":null,"blocks":[]}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_templates_user_id_idx
  on public.session_templates (user_id);

create index if not exists session_templates_user_updated_idx
  on public.session_templates (user_id, updated_at desc);

create index if not exists session_templates_category_id_idx
  on public.session_templates (category_id);

create unique index if not exists session_templates_user_name_unique
  on public.session_templates (user_id, lower(name))
  where archived_at is null;

alter table public.session_templates enable row level security;

drop policy if exists "session_templates_select_own" on public.session_templates;
drop policy if exists "session_templates_insert_own" on public.session_templates;
drop policy if exists "session_templates_update_own" on public.session_templates;
drop policy if exists "session_templates_delete_own" on public.session_templates;

create policy "session_templates_select_own"
  on public.session_templates for select
  to authenticated
  using (user_id = auth.uid());

create policy "session_templates_insert_own"
  on public.session_templates for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "session_templates_update_own"
  on public.session_templates for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "session_templates_delete_own"
  on public.session_templates for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.session_templates to authenticated;

notify pgrst, 'reload schema';
