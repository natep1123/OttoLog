-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Templates: exercise / cluster / block / session + template link tables.
-- Requires: 001_users, 003_locked_atoms, 004_taxonomy, 005_analytics

-- ---------------------------------------------------------------------------
-- exercise_templates (+ track_intensity)
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text,
  tool_id uuid not null references public.tools (id),
  target_shape_id uuid not null references public.target_shapes (id),
  track_analytics boolean not null default false,
  track_intensity boolean not null default false,
  primary_group_id uuid references public.analytics_primary_groups (id),
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

create index if not exists exercise_templates_user_id_idx
  on public.exercise_templates (user_id);

create index if not exists exercise_templates_user_updated_idx
  on public.exercise_templates (user_id, updated_at desc);

create unique index if not exists exercise_templates_user_name_unique
  on public.exercise_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

-- Variations on templates (product: Variations; table: analytics_tags)
create table if not exists public.analytics_tag_links (
  id uuid primary key default gen_random_uuid(),
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  tag_id uuid not null
    references public.analytics_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint analytics_tag_links_unique unique (exercise_template_id, tag_id)
);

create index if not exists analytics_tag_links_template_idx
  on public.analytics_tag_links (exercise_template_id);
create index if not exists analytics_tag_links_tag_idx
  on public.analytics_tag_links (tag_id);

create table if not exists public.exercise_template_tool_links (
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  tool_id uuid not null references public.tools (id),
  sort_order integer not null default 0,
  primary key (exercise_template_id, tool_id)
);

create index if not exists exercise_template_tool_links_template_idx
  on public.exercise_template_tool_links (exercise_template_id, sort_order);
create index if not exists exercise_template_tool_links_tool_idx
  on public.exercise_template_tool_links (tool_id);

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

create table if not exists public.exercise_template_muscle_group_links (
  exercise_template_id uuid not null
    references public.exercise_templates (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (exercise_template_id, muscle_group_id)
);

create index if not exists exercise_template_mg_links_template_idx
  on public.exercise_template_muscle_group_links (
    exercise_template_id, sort_order
  );
create index if not exists exercise_template_mg_links_group_idx
  on public.exercise_template_muscle_group_links (muscle_group_id);

-- ---------------------------------------------------------------------------
-- cluster_templates / block_templates / session_templates
-- ---------------------------------------------------------------------------

create table if not exists public.cluster_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text,
  cluster_type text not null
    check (cluster_type in ('superset', 'circuit')),
  label_id uuid not null default '60000000-0000-4000-8000-000000000001'
    references public.cluster_labels (id),
  content jsonb not null default
    '{"notes":null,"track_duration":false,"duration":null,"rounds":1,"items":[],"overrides":[]}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cluster_templates_user_id_idx
  on public.cluster_templates (user_id);
create index if not exists cluster_templates_user_updated_idx
  on public.cluster_templates (user_id, updated_at desc);
create index if not exists cluster_templates_label_id_idx
  on public.cluster_templates (label_id);
create unique index if not exists cluster_templates_user_name_unique
  on public.cluster_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

create table if not exists public.block_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text,
  label_id uuid not null default '50000000-0000-4000-8000-000000000001'
    references public.block_labels (id),
  content jsonb not null default
    '{"notes":null,"track_duration":false,"duration":null,"items":[]}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists block_templates_user_id_idx
  on public.block_templates (user_id);
create index if not exists block_templates_user_updated_idx
  on public.block_templates (user_id, updated_at desc);
create index if not exists block_templates_label_id_idx
  on public.block_templates (label_id);
create unique index if not exists block_templates_user_name_unique
  on public.block_templates (user_id, lower(name))
  where archived_at is null and name is not null and length(trim(name)) > 0;

create table if not exists public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text,
  category_id uuid not null references public.session_categories (id),
  content jsonb not null default
    '{"notes":null,"track_duration":false,"duration":null,"blocks":[]}'::jsonb,
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
  where archived_at is null and name is not null and length(trim(name)) > 0;

-- ---------------------------------------------------------------------------
-- RLS — templates
-- ---------------------------------------------------------------------------

alter table public.exercise_templates enable row level security;
alter table public.cluster_templates enable row level security;
alter table public.block_templates enable row level security;
alter table public.session_templates enable row level security;
alter table public.analytics_tag_links enable row level security;
alter table public.exercise_template_tool_links enable row level security;
alter table public.exercise_template_primary_group_links enable row level security;
alter table public.exercise_template_muscle_group_links enable row level security;

drop policy if exists "exercise_templates_select_own" on public.exercise_templates;
drop policy if exists "exercise_templates_insert_own" on public.exercise_templates;
drop policy if exists "exercise_templates_update_own" on public.exercise_templates;
drop policy if exists "exercise_templates_delete_own" on public.exercise_templates;

create policy "exercise_templates_select_own"
  on public.exercise_templates for select to authenticated
  using (user_id = auth.uid());
create policy "exercise_templates_insert_own"
  on public.exercise_templates for insert to authenticated
  with check (user_id = auth.uid());
create policy "exercise_templates_update_own"
  on public.exercise_templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercise_templates_delete_own"
  on public.exercise_templates for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "cluster_templates_select_own" on public.cluster_templates;
drop policy if exists "cluster_templates_insert_own" on public.cluster_templates;
drop policy if exists "cluster_templates_update_own" on public.cluster_templates;
drop policy if exists "cluster_templates_delete_own" on public.cluster_templates;

create policy "cluster_templates_select_own"
  on public.cluster_templates for select to authenticated
  using (user_id = auth.uid());
create policy "cluster_templates_insert_own"
  on public.cluster_templates for insert to authenticated
  with check (user_id = auth.uid());
create policy "cluster_templates_update_own"
  on public.cluster_templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cluster_templates_delete_own"
  on public.cluster_templates for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "block_templates_select_own" on public.block_templates;
drop policy if exists "block_templates_insert_own" on public.block_templates;
drop policy if exists "block_templates_update_own" on public.block_templates;
drop policy if exists "block_templates_delete_own" on public.block_templates;

create policy "block_templates_select_own"
  on public.block_templates for select to authenticated
  using (user_id = auth.uid());
create policy "block_templates_insert_own"
  on public.block_templates for insert to authenticated
  with check (user_id = auth.uid());
create policy "block_templates_update_own"
  on public.block_templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "block_templates_delete_own"
  on public.block_templates for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "session_templates_select_own" on public.session_templates;
drop policy if exists "session_templates_insert_own" on public.session_templates;
drop policy if exists "session_templates_update_own" on public.session_templates;
drop policy if exists "session_templates_delete_own" on public.session_templates;

create policy "session_templates_select_own"
  on public.session_templates for select to authenticated
  using (user_id = auth.uid());
create policy "session_templates_insert_own"
  on public.session_templates for insert to authenticated
  with check (user_id = auth.uid());
create policy "session_templates_update_own"
  on public.session_templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "session_templates_delete_own"
  on public.session_templates for delete to authenticated
  using (user_id = auth.uid());

-- Link RLS via owning exercise template

drop policy if exists "analytics_tag_links_select_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_insert_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_update_own" on public.analytics_tag_links;
drop policy if exists "analytics_tag_links_delete_own" on public.analytics_tag_links;

create policy "analytics_tag_links_select_own"
  on public.analytics_tag_links for select to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );
create policy "analytics_tag_links_insert_own"
  on public.analytics_tag_links for insert to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "analytics_tag_links_update_own"
  on public.analytics_tag_links for update to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "analytics_tag_links_delete_own"
  on public.analytics_tag_links for delete to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

drop policy if exists "exercise_template_tool_links_select_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_insert_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_update_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_delete_own"
  on public.exercise_template_tool_links;

create policy "exercise_template_tool_links_select_own"
  on public.exercise_template_tool_links for select to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );
create policy "exercise_template_tool_links_insert_own"
  on public.exercise_template_tool_links for insert to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tools t
      where t.id = tool_id and (t.user_id = auth.uid() or t.user_id is null)
    )
  );
create policy "exercise_template_tool_links_update_own"
  on public.exercise_template_tool_links for update to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tools t
      where t.id = tool_id and (t.user_id = auth.uid() or t.user_id is null)
    )
  );
create policy "exercise_template_tool_links_delete_own"
  on public.exercise_template_tool_links for delete to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

drop policy if exists "exercise_template_pg_links_select_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_insert_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_update_own"
  on public.exercise_template_primary_group_links;
drop policy if exists "exercise_template_pg_links_delete_own"
  on public.exercise_template_primary_group_links;

create policy "exercise_template_pg_links_select_own"
  on public.exercise_template_primary_group_links for select to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );
create policy "exercise_template_pg_links_insert_own"
  on public.exercise_template_primary_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );
create policy "exercise_template_pg_links_update_own"
  on public.exercise_template_primary_group_links for update to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_primary_groups g
      where g.id = primary_group_id and g.user_id = auth.uid()
    )
  );
create policy "exercise_template_pg_links_delete_own"
  on public.exercise_template_primary_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

drop policy if exists "exercise_template_mg_links_select_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_insert_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_update_own"
  on public.exercise_template_muscle_group_links;
drop policy if exists "exercise_template_mg_links_delete_own"
  on public.exercise_template_muscle_group_links;

create policy "exercise_template_mg_links_select_own"
  on public.exercise_template_muscle_group_links for select to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );
create policy "exercise_template_mg_links_insert_own"
  on public.exercise_template_muscle_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_muscle_groups g
      where g.id = muscle_group_id and g.user_id = auth.uid()
    )
  );
create policy "exercise_template_mg_links_update_own"
  on public.exercise_template_muscle_group_links for update to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_muscle_groups g
      where g.id = muscle_group_id and g.user_id = auth.uid()
    )
  );
create policy "exercise_template_mg_links_delete_own"
  on public.exercise_template_muscle_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id and et.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.exercise_templates to authenticated;
grant select, insert, update, delete on public.cluster_templates to authenticated;
grant select, insert, update, delete on public.block_templates to authenticated;
grant select, insert, update, delete on public.session_templates to authenticated;
grant select, insert, update, delete on public.analytics_tag_links to authenticated;
grant select, insert, update, delete
  on public.exercise_template_tool_links to authenticated;
grant select, insert, update, delete
  on public.exercise_template_primary_group_links to authenticated;
grant select, insert, update, delete
  on public.exercise_template_muscle_group_links to authenticated;

notify pgrst, 'reload schema';
