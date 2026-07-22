-- OttoLog Migration D — Exercise templates + tag links (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Templates + Recommended Build Order step 4
--
-- Requires: 003_locked_atoms, 004_taxonomy, 005_analytics_taxonomy
--
-- Official naming: target_shape_id → target_shapes (NOT comp_category_id)
-- Tags live in analytics_tag_links only (no tag-id array column on this table).

create table if not exists public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  tool_id uuid not null references public.tools (id),
  target_shape_id uuid not null references public.target_shapes (id),
  track_analytics boolean not null default false,
  primary_group_id uuid references public.analytics_primary_groups (id),
  -- Prescribed targets[] payload for this shape (not the shape enum)
  default_target_shape jsonb not null default '[]'::jsonb,
  track_duration boolean not null default false,
  duration text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_templates_analytics_group check (
    (track_analytics = true and primary_group_id is not null)
    or
    (track_analytics = false and primary_group_id is null)
  ),
  constraint exercise_templates_duration_shape check (
    (track_duration = true and duration is not null)
    or
    (track_duration = false and duration is null)
  )
);

create table if not exists public.analytics_tag_links (
  id uuid primary key default gen_random_uuid(),
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  tag_id uuid not null
    references public.analytics_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint analytics_tag_links_unique unique (exercise_template_id, tag_id)
);

create index if not exists exercise_templates_user_id_idx
  on public.exercise_templates (user_id);

create index if not exists exercise_templates_user_updated_idx
  on public.exercise_templates (user_id, updated_at desc);

create index if not exists analytics_tag_links_template_idx
  on public.analytics_tag_links (exercise_template_id);

create index if not exists analytics_tag_links_tag_idx
  on public.analytics_tag_links (tag_id);

-- RLS

alter table public.exercise_templates enable row level security;
alter table public.analytics_tag_links enable row level security;

drop policy if exists "exercise_templates_select_own" on public.exercise_templates;
drop policy if exists "exercise_templates_insert_own" on public.exercise_templates;
drop policy if exists "exercise_templates_update_own" on public.exercise_templates;
drop policy if exists "exercise_templates_delete_own" on public.exercise_templates;

drop policy if exists "analytics_tag_links_select_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_insert_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_update_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_delete_own" on public.analytics_tag_links;

create policy "exercise_templates_select_own"
  on public.exercise_templates for select
  to authenticated
  using (user_id = auth.uid());

create policy "exercise_templates_insert_own"
  on public.exercise_templates for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "exercise_templates_update_own"
  on public.exercise_templates for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exercise_templates_delete_own"
  on public.exercise_templates for delete
  to authenticated
  using (user_id = auth.uid());

-- Tag links: owned via the exercise template (+ tag must be the same user)
create policy "analytics_tag_links_select_own"
  on public.analytics_tag_links for select
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

create policy "analytics_tag_links_insert_own"
  on public.analytics_tag_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id
        and t.user_id = auth.uid()
    )
  );

create policy "analytics_tag_links_update_own"
  on public.analytics_tag_links for update
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id
        and t.user_id = auth.uid()
    )
  );

create policy "analytics_tag_links_delete_own"
  on public.analytics_tag_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.exercise_templates to authenticated;
grant select, insert, update, delete on public.analytics_tag_links to authenticated;

notify pgrst, 'reload schema';
