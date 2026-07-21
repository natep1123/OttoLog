-- OttoLog Migration O — Primary group suggested tags (soft filter)
-- Requires: 005_analytics_taxonomy
--
-- Soft picker hints only: which tags to surface for a primary group.
-- Does not constrain stored exercise tag links. Muscles unaffected.

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

alter table public.analytics_primary_group_tag_suggestions
  enable row level security;

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
  on public.analytics_primary_group_tag_suggestions to authenticated;

notify pgrst, 'reload schema';
