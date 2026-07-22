-- OttoLog Migration M — Multi primary groups (complexes)
-- Requires: 005_analytics_taxonomy, 006_exercise_templates, 014_session_logs
--
-- Ordered M2M so complexes (e.g. 360-to-Squat) credit multiple chart nouns.
-- Keeps singular primary_group_id as primary (= first selected) for CHECK/compat.

-- ---------------------------------------------------------------------------
-- exercise_template_primary_group_links
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_template_primary_group_links (
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  primary_group_id uuid not null
    references public.analytics_primary_groups (id),
  sort_order integer not null default 0,
  primary key (exercise_template_id, primary_group_id)
);

create index if not exists exercise_template_pg_links_template_idx
  on public.exercise_template_primary_group_links (
    exercise_template_id, sort_order
  );

create index if not exists exercise_template_pg_links_group_idx
  on public.exercise_template_primary_group_links (primary_group_id);

insert into public.exercise_template_primary_group_links (
  exercise_template_id, primary_group_id, sort_order
)
select et.id, et.primary_group_id, 0
from public.exercise_templates et
where et.primary_group_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- log_item_primary_group_links / log_sub_item_primary_group_links
-- ---------------------------------------------------------------------------

create table if not exists public.log_item_primary_group_links (
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  primary_group_id uuid not null
    references public.analytics_primary_groups (id),
  sort_order integer not null default 0,
  primary key (log_item_id, primary_group_id)
);

create index if not exists log_item_pg_links_item_idx
  on public.log_item_primary_group_links (log_item_id, sort_order);

create index if not exists log_item_pg_links_group_idx
  on public.log_item_primary_group_links (primary_group_id);

create table if not exists public.log_sub_item_primary_group_links (
  log_sub_item_id uuid not null
    references public.log_sub_items (id) on delete cascade,
  primary_group_id uuid not null
    references public.analytics_primary_groups (id),
  sort_order integer not null default 0,
  primary key (log_sub_item_id, primary_group_id)
);

create index if not exists log_sub_item_pg_links_sub_idx
  on public.log_sub_item_primary_group_links (log_sub_item_id, sort_order);

create index if not exists log_sub_item_pg_links_group_idx
  on public.log_sub_item_primary_group_links (primary_group_id);

insert into public.log_item_primary_group_links (
  log_item_id, primary_group_id, sort_order
)
select li.id, li.primary_group_id, 0
from public.log_items li
where li.primary_group_id is not null
on conflict do nothing;

insert into public.log_sub_item_primary_group_links (
  log_sub_item_id, primary_group_id, sort_order
)
select lsi.id, lsi.primary_group_id, 0
from public.log_sub_items lsi
where lsi.primary_group_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.exercise_template_primary_group_links enable row level security;
alter table public.log_item_primary_group_links enable row level security;
alter table public.log_sub_item_primary_group_links enable row level security;

drop policy if exists "exercise_template_pg_links_select_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_insert_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_update_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_delete_own"
  on public.exercise_template_primary_group_links;

create policy "exercise_template_pg_links_select_own"
  on public.exercise_template_primary_group_links for select
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

create policy "exercise_template_pg_links_insert_own"
  on public.exercise_template_primary_group_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );

create policy "exercise_template_pg_links_update_own"
  on public.exercise_template_primary_group_links for update
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
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );

create policy "exercise_template_pg_links_delete_own"
  on public.exercise_template_primary_group_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

drop policy if exists "log_item_pg_links_select_own"
  on public.log_item_primary_group_links;
drop policy if exists "log_item_pg_links_insert_own"
  on public.log_item_primary_group_links;
drop policy if exists "log_item_pg_links_update_own"
  on public.log_item_primary_group_links;
drop policy if exists "log_item_pg_links_delete_own"
  on public.log_item_primary_group_links;

create policy "log_item_pg_links_select_own"
  on public.log_item_primary_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_primary_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_pg_links_insert_own"
  on public.log_item_primary_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_primary_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_pg_links_update_own"
  on public.log_item_primary_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_primary_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_primary_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_pg_links_delete_own"
  on public.log_item_primary_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_primary_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_item_pg_links_select_own"
  on public.log_sub_item_primary_group_links;
drop policy if exists "log_sub_item_pg_links_insert_own"
  on public.log_sub_item_primary_group_links;
drop policy if exists "log_sub_item_pg_links_update_own"
  on public.log_sub_item_primary_group_links;
drop policy if exists "log_sub_item_pg_links_delete_own"
  on public.log_sub_item_primary_group_links;

create policy "log_sub_item_pg_links_select_own"
  on public.log_sub_item_primary_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_primary_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_pg_links_insert_own"
  on public.log_sub_item_primary_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_primary_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_pg_links_update_own"
  on public.log_sub_item_primary_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_primary_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_primary_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_pg_links_delete_own"
  on public.log_sub_item_primary_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_primary_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete
  on public.exercise_template_primary_group_links to authenticated;
grant select, insert, update, delete
  on public.log_item_primary_group_links to authenticated;
grant select, insert, update, delete
  on public.log_sub_item_primary_group_links to authenticated;

notify pgrst, 'reload schema';
