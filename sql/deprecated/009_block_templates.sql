-- OttoLog Migration G — Block templates (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Templates + Recommended Build Order step 5b
--
-- Requires: 001_users (public.users)
--
-- Standalone block blueprints. content jsonb holds notes/duration + items[]
-- as an ordered mix of exercise and cluster blobs (copied, no template FKs).

create table if not exists public.block_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  content jsonb not null default '{"notes":null,"track_duration":false,"duration":null,"items":[]}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists block_templates_user_id_idx
  on public.block_templates (user_id);

create index if not exists block_templates_user_updated_idx
  on public.block_templates (user_id, updated_at desc);

create unique index if not exists block_templates_user_name_unique
  on public.block_templates (user_id, lower(name))
  where archived_at is null;

alter table public.block_templates enable row level security;

drop policy if exists "block_templates_select_own" on public.block_templates;
drop policy if exists "block_templates_insert_own" on public.block_templates;
drop policy if exists "block_templates_update_own" on public.block_templates;
drop policy if exists "block_templates_delete_own" on public.block_templates;

create policy "block_templates_select_own"
  on public.block_templates for select
  to authenticated
  using (user_id = auth.uid());

create policy "block_templates_insert_own"
  on public.block_templates for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "block_templates_update_own"
  on public.block_templates for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "block_templates_delete_own"
  on public.block_templates for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.block_templates to authenticated;

notify pgrst, 'reload schema';
