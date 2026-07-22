-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Session logs + all log link tables + set_type/intensity + log variation links,
-- plus Insights fact helpers / v_log_set_facts (formerly a separate 008).
-- Requires: 001–006

-- ---------------------------------------------------------------------------
-- session_logs (header)
-- ---------------------------------------------------------------------------

create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  template_id uuid references public.session_templates (id) on delete set null,
  name text,
  category_id uuid not null references public.session_categories (id),
  session_date date not null default (timezone('utc', now()))::date,
  notes text,
  track_duration boolean not null default false,
  duration text,
  status text not null default 'draft'
    check (status in ('draft', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_logs_duration_shape check (
    (track_duration = true and duration is not null)
    or
    (track_duration = false and duration is null)
  )
);

create index if not exists session_logs_user_date_idx
  on public.session_logs (user_id, session_date desc);

create index if not exists session_logs_user_status_idx
  on public.session_logs (user_id, status);

create index if not exists session_logs_template_id_idx
  on public.session_logs (template_id);

-- ---------------------------------------------------------------------------
-- log_blocks
-- ---------------------------------------------------------------------------

create table if not exists public.log_blocks (
  id uuid primary key default gen_random_uuid(),
  session_log_id uuid not null
    references public.session_logs (id) on delete cascade,
  block_order integer not null,
  name text,
  label_id uuid not null references public.block_labels (id),
  notes text,
  track_duration boolean not null default false,
  duration text,
  constraint log_blocks_duration_shape check (
    (track_duration = true and duration is not null)
    or
    (track_duration = false and duration is null)
  )
);

create index if not exists log_blocks_session_order_idx
  on public.log_blocks (session_log_id, block_order);

-- ---------------------------------------------------------------------------
-- log_items (exercise | cluster)
-- ---------------------------------------------------------------------------

create table if not exists public.log_items (
  id uuid primary key default gen_random_uuid(),
  log_block_id uuid not null
    references public.log_blocks (id) on delete cascade,
  item_order integer not null,
  kind text not null check (kind in ('exercise', 'cluster')),
  name text,
  notes text,
  track_duration boolean not null default false,
  duration text,
  -- cluster only
  cluster_type text check (cluster_type in ('superset', 'circuit')),
  label_id uuid references public.cluster_labels (id),
  rounds integer,
  -- exercise only
  tool_id uuid references public.tools (id),
  target_shape_id uuid references public.target_shapes (id),
  track_analytics boolean,
  track_intensity boolean, -- exercise only; null on clusters
  primary_group_id uuid references public.analytics_primary_groups (id),
  constraint log_items_duration_shape check (
    (track_duration = true and duration is not null)
    or
    (track_duration = false and duration is null)
  ),
  constraint log_items_kind_shape check (
    (
      kind = 'exercise'
      and tool_id is not null
      and target_shape_id is not null
      and cluster_type is null
      and label_id is null
      and rounds is null
      and track_intensity is not null
      and (
        (track_analytics = true and primary_group_id is not null)
        or
        (track_analytics = false and primary_group_id is null)
        or
        track_analytics is null
      )
    )
    or
    (
      kind = 'cluster'
      and cluster_type is not null
      and tool_id is null
      and target_shape_id is null
      and track_analytics is null
      and track_intensity is null
      and primary_group_id is null
    )
  )
);

create index if not exists log_items_block_order_idx
  on public.log_items (log_block_id, item_order);

create index if not exists log_items_primary_group_idx
  on public.log_items (primary_group_id)
  where primary_group_id is not null;

-- ---------------------------------------------------------------------------
-- log_sub_items (nested exercise inside a cluster item)
-- ---------------------------------------------------------------------------

create table if not exists public.log_sub_items (
  id uuid primary key default gen_random_uuid(),
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  sub_item_order integer not null,
  name text,
  notes text,
  tool_id uuid not null references public.tools (id),
  target_shape_id uuid not null references public.target_shapes (id),
  track_analytics boolean not null default false,
  track_intensity boolean not null default false,
  primary_group_id uuid references public.analytics_primary_groups (id),
  track_duration boolean not null default false,
  duration text,
  constraint log_sub_items_duration_shape check (
    (track_duration = true and duration is not null)
    or
    (track_duration = false and duration is null)
  ),
  constraint log_sub_items_analytics_group check (
    (track_analytics = true and primary_group_id is not null)
    or
    (track_analytics = false and primary_group_id is null)
  )
);

create index if not exists log_sub_items_item_order_idx
  on public.log_sub_items (log_item_id, sub_item_order);

create index if not exists log_sub_items_primary_group_idx
  on public.log_sub_items (primary_group_id)
  where primary_group_id is not null;

-- ---------------------------------------------------------------------------
-- log_sets (+ set_type / intensity)
-- ---------------------------------------------------------------------------

create table if not exists public.log_sets (
  id uuid primary key default gen_random_uuid(),
  log_item_id uuid references public.log_items (id) on delete cascade,
  log_sub_item_id uuid references public.log_sub_items (id) on delete cascade,
  set_number integer not null,
  reps integer,
  is_per_side boolean not null default false,
  time_duration text,
  distance_value numeric,
  distance_unit text,
  load_value numeric,
  load_unit text,
  track_analytics boolean,
  set_type text not null default 'Working'
    check (set_type in ('Warmup', 'Working', 'Drop', 'Failure', 'AMRAP', 'Backoff')),
  intensity numeric(3, 1),
  constraint log_sets_parent_xor check (
    (log_item_id is not null and log_sub_item_id is null)
    or
    (log_item_id is null and log_sub_item_id is not null)
  ),
  constraint log_sets_intensity_shape check (
    intensity is null
    or (
      intensity >= 0.5
      and intensity <= 10.0
      and mod((intensity * 2)::numeric, 1) = 0
    )
  )
);

create index if not exists log_sets_item_idx
  on public.log_sets (log_item_id)
  where log_item_id is not null;

create index if not exists log_sets_sub_item_idx
  on public.log_sets (log_sub_item_id)
  where log_sub_item_id is not null;

-- ---------------------------------------------------------------------------
-- Link tables (tools / primary groups / muscle groups / variations)
-- ---------------------------------------------------------------------------

create table if not exists public.log_item_tools (
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  tool_id uuid not null references public.tools (id),
  sort_order integer not null default 0,
  primary key (log_item_id, tool_id)
);

create index if not exists log_item_tools_item_idx
  on public.log_item_tools (log_item_id, sort_order);

create index if not exists log_item_tools_tool_idx
  on public.log_item_tools (tool_id);

create table if not exists public.log_sub_item_tools (
  log_sub_item_id uuid not null
    references public.log_sub_items (id) on delete cascade,
  tool_id uuid not null references public.tools (id),
  sort_order integer not null default 0,
  primary key (log_sub_item_id, tool_id)
);

create index if not exists log_sub_item_tools_sub_idx
  on public.log_sub_item_tools (log_sub_item_id, sort_order);

create index if not exists log_sub_item_tools_tool_idx
  on public.log_sub_item_tools (tool_id);

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

create table if not exists public.log_item_muscle_group_links (
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (log_item_id, muscle_group_id)
);

create index if not exists log_item_mg_links_item_idx
  on public.log_item_muscle_group_links (log_item_id, sort_order);

create index if not exists log_item_mg_links_group_idx
  on public.log_item_muscle_group_links (muscle_group_id);

create table if not exists public.log_sub_item_muscle_group_links (
  log_sub_item_id uuid not null
    references public.log_sub_items (id) on delete cascade,
  muscle_group_id uuid not null
    references public.analytics_muscle_groups (id),
  sort_order integer not null default 0,
  primary key (log_sub_item_id, muscle_group_id)
);

create index if not exists log_sub_item_mg_links_sub_idx
  on public.log_sub_item_muscle_group_links (log_sub_item_id, sort_order);

create index if not exists log_sub_item_mg_links_group_idx
  on public.log_sub_item_muscle_group_links (muscle_group_id);

-- Variations on logs (product: Variations; table: analytics_tags)
create table if not exists public.log_item_tag_links (
  log_item_id uuid not null
    references public.log_items (id) on delete cascade,
  tag_id uuid not null references public.analytics_tags (id),
  sort_order integer not null default 0,
  primary key (log_item_id, tag_id)
);

create index if not exists log_item_tag_links_item_idx
  on public.log_item_tag_links (log_item_id, sort_order);

create index if not exists log_item_tag_links_tag_idx
  on public.log_item_tag_links (tag_id);

create table if not exists public.log_sub_item_tag_links (
  log_sub_item_id uuid not null
    references public.log_sub_items (id) on delete cascade,
  tag_id uuid not null references public.analytics_tags (id),
  sort_order integer not null default 0,
  primary key (log_sub_item_id, tag_id)
);

create index if not exists log_sub_item_tag_links_sub_idx
  on public.log_sub_item_tag_links (log_sub_item_id, sort_order);

create index if not exists log_sub_item_tag_links_tag_idx
  on public.log_sub_item_tag_links (tag_id);

-- ---------------------------------------------------------------------------
-- RLS — core log tables
-- ---------------------------------------------------------------------------

alter table public.session_logs enable row level security;
alter table public.log_blocks enable row level security;
alter table public.log_items enable row level security;
alter table public.log_sub_items enable row level security;
alter table public.log_sets enable row level security;

drop policy if exists "session_logs_select_own" on public.session_logs;
drop policy if exists "session_logs_insert_own" on public.session_logs;
drop policy if exists "session_logs_update_own" on public.session_logs;
drop policy if exists "session_logs_delete_own" on public.session_logs;

create policy "session_logs_select_own"
  on public.session_logs for select to authenticated
  using (user_id = auth.uid());
create policy "session_logs_insert_own"
  on public.session_logs for insert to authenticated
  with check (user_id = auth.uid());
create policy "session_logs_update_own"
  on public.session_logs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "session_logs_delete_own"
  on public.session_logs for delete to authenticated
  using (user_id = auth.uid());

-- Child tables: own via parent session_logs.user_id

drop policy if exists "log_blocks_select_own" on public.log_blocks;
drop policy if exists "log_blocks_insert_own" on public.log_blocks;
drop policy if exists "log_blocks_update_own" on public.log_blocks;
drop policy if exists "log_blocks_delete_own" on public.log_blocks;

create policy "log_blocks_select_own"
  on public.log_blocks for select to authenticated
  using (
    exists (
      select 1 from public.session_logs s
      where s.id = log_blocks.session_log_id and s.user_id = auth.uid()
    )
  );
create policy "log_blocks_insert_own"
  on public.log_blocks for insert to authenticated
  with check (
    exists (
      select 1 from public.session_logs s
      where s.id = log_blocks.session_log_id and s.user_id = auth.uid()
    )
  );
create policy "log_blocks_update_own"
  on public.log_blocks for update to authenticated
  using (
    exists (
      select 1 from public.session_logs s
      where s.id = log_blocks.session_log_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.session_logs s
      where s.id = log_blocks.session_log_id and s.user_id = auth.uid()
    )
  );
create policy "log_blocks_delete_own"
  on public.log_blocks for delete to authenticated
  using (
    exists (
      select 1 from public.session_logs s
      where s.id = log_blocks.session_log_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_items_select_own" on public.log_items;
drop policy if exists "log_items_insert_own" on public.log_items;
drop policy if exists "log_items_update_own" on public.log_items;
drop policy if exists "log_items_delete_own" on public.log_items;

create policy "log_items_select_own"
  on public.log_items for select to authenticated
  using (
    exists (
      select 1 from public.log_blocks b
      join public.session_logs s on s.id = b.session_log_id
      where b.id = log_items.log_block_id and s.user_id = auth.uid()
    )
  );
create policy "log_items_insert_own"
  on public.log_items for insert to authenticated
  with check (
    exists (
      select 1 from public.log_blocks b
      join public.session_logs s on s.id = b.session_log_id
      where b.id = log_items.log_block_id and s.user_id = auth.uid()
    )
  );
create policy "log_items_update_own"
  on public.log_items for update to authenticated
  using (
    exists (
      select 1 from public.log_blocks b
      join public.session_logs s on s.id = b.session_log_id
      where b.id = log_items.log_block_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_blocks b
      join public.session_logs s on s.id = b.session_log_id
      where b.id = log_items.log_block_id and s.user_id = auth.uid()
    )
  );
create policy "log_items_delete_own"
  on public.log_items for delete to authenticated
  using (
    exists (
      select 1 from public.log_blocks b
      join public.session_logs s on s.id = b.session_log_id
      where b.id = log_items.log_block_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_items_select_own" on public.log_sub_items;
drop policy if exists "log_sub_items_insert_own" on public.log_sub_items;
drop policy if exists "log_sub_items_update_own" on public.log_sub_items;
drop policy if exists "log_sub_items_delete_own" on public.log_sub_items;

create policy "log_sub_items_select_own"
  on public.log_sub_items for select to authenticated
  using (
    exists (
      select 1 from public.log_items i
      join public.log_blocks b on b.id = i.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where i.id = log_sub_items.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_sub_items_insert_own"
  on public.log_sub_items for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items i
      join public.log_blocks b on b.id = i.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where i.id = log_sub_items.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_sub_items_update_own"
  on public.log_sub_items for update to authenticated
  using (
    exists (
      select 1 from public.log_items i
      join public.log_blocks b on b.id = i.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where i.id = log_sub_items.log_item_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items i
      join public.log_blocks b on b.id = i.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where i.id = log_sub_items.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_sub_items_delete_own"
  on public.log_sub_items for delete to authenticated
  using (
    exists (
      select 1 from public.log_items i
      join public.log_blocks b on b.id = i.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where i.id = log_sub_items.log_item_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sets_select_own" on public.log_sets;
drop policy if exists "log_sets_insert_own" on public.log_sets;
drop policy if exists "log_sets_update_own" on public.log_sets;
drop policy if exists "log_sets_delete_own" on public.log_sets;

create policy "log_sets_select_own"
  on public.log_sets for select to authenticated
  using (
    (
      log_item_id is not null
      and exists (
        select 1 from public.log_items i
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where i.id = log_sets.log_item_id and s.user_id = auth.uid()
      )
    )
    or
    (
      log_sub_item_id is not null
      and exists (
        select 1 from public.log_sub_items si
        join public.log_items i on i.id = si.log_item_id
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where si.id = log_sets.log_sub_item_id and s.user_id = auth.uid()
      )
    )
  );
create policy "log_sets_insert_own"
  on public.log_sets for insert to authenticated
  with check (
    (
      log_item_id is not null
      and exists (
        select 1 from public.log_items i
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where i.id = log_sets.log_item_id and s.user_id = auth.uid()
      )
    )
    or
    (
      log_sub_item_id is not null
      and exists (
        select 1 from public.log_sub_items si
        join public.log_items i on i.id = si.log_item_id
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where si.id = log_sets.log_sub_item_id and s.user_id = auth.uid()
      )
    )
  );
create policy "log_sets_update_own"
  on public.log_sets for update to authenticated
  using (
    (
      log_item_id is not null
      and exists (
        select 1 from public.log_items i
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where i.id = log_sets.log_item_id and s.user_id = auth.uid()
      )
    )
    or
    (
      log_sub_item_id is not null
      and exists (
        select 1 from public.log_sub_items si
        join public.log_items i on i.id = si.log_item_id
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where si.id = log_sets.log_sub_item_id and s.user_id = auth.uid()
      )
    )
  )
  with check (
    (
      log_item_id is not null
      and exists (
        select 1 from public.log_items i
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where i.id = log_sets.log_item_id and s.user_id = auth.uid()
      )
    )
    or
    (
      log_sub_item_id is not null
      and exists (
        select 1 from public.log_sub_items si
        join public.log_items i on i.id = si.log_item_id
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where si.id = log_sets.log_sub_item_id and s.user_id = auth.uid()
      )
    )
  );
create policy "log_sets_delete_own"
  on public.log_sets for delete to authenticated
  using (
    (
      log_item_id is not null
      and exists (
        select 1 from public.log_items i
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where i.id = log_sets.log_item_id and s.user_id = auth.uid()
      )
    )
    or
    (
      log_sub_item_id is not null
      and exists (
        select 1 from public.log_sub_items si
        join public.log_items i on i.id = si.log_item_id
        join public.log_blocks b on b.id = i.log_block_id
        join public.session_logs s on s.id = b.session_log_id
        where si.id = log_sets.log_sub_item_id and s.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — link tables (own via session_logs)
-- ---------------------------------------------------------------------------

alter table public.log_item_tools enable row level security;
alter table public.log_sub_item_tools enable row level security;
alter table public.log_item_primary_group_links enable row level security;
alter table public.log_sub_item_primary_group_links enable row level security;
alter table public.log_item_muscle_group_links enable row level security;
alter table public.log_sub_item_muscle_group_links enable row level security;
alter table public.log_item_tag_links enable row level security;
alter table public.log_sub_item_tag_links enable row level security;

drop policy if exists "log_item_tools_select_own" on public.log_item_tools;
drop policy if exists "log_item_tools_insert_own" on public.log_item_tools;
drop policy if exists "log_item_tools_update_own" on public.log_item_tools;
drop policy if exists "log_item_tools_delete_own" on public.log_item_tools;

create policy "log_item_tools_select_own"
  on public.log_item_tools for select to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tools.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_item_tools_insert_own"
  on public.log_item_tools for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tools.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_item_tools_update_own"
  on public.log_item_tools for update to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tools.log_item_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tools.log_item_id and s.user_id = auth.uid()
    )
  );
create policy "log_item_tools_delete_own"
  on public.log_item_tools for delete to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tools.log_item_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_item_tools_select_own" on public.log_sub_item_tools;
drop policy if exists "log_sub_item_tools_insert_own" on public.log_sub_item_tools;
drop policy if exists "log_sub_item_tools_update_own" on public.log_sub_item_tools;
drop policy if exists "log_sub_item_tools_delete_own" on public.log_sub_item_tools;

create policy "log_sub_item_tools_select_own"
  on public.log_sub_item_tools for select to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tools.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tools_insert_own"
  on public.log_sub_item_tools for insert to authenticated
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tools.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tools_update_own"
  on public.log_sub_item_tools for update to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tools.log_sub_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tools.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tools_delete_own"
  on public.log_sub_item_tools for delete to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tools.log_sub_item_id
        and s.user_id = auth.uid()
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

drop policy if exists "log_item_mg_links_select_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_insert_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_update_own"
  on public.log_item_muscle_group_links;
drop policy if exists "log_item_mg_links_delete_own"
  on public.log_item_muscle_group_links;

create policy "log_item_mg_links_select_own"
  on public.log_item_muscle_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_insert_own"
  on public.log_item_muscle_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_update_own"
  on public.log_item_muscle_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_mg_links_delete_own"
  on public.log_item_muscle_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_muscle_group_links.log_item_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_item_mg_links_select_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_insert_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_update_own"
  on public.log_sub_item_muscle_group_links;
drop policy if exists "log_sub_item_mg_links_delete_own"
  on public.log_sub_item_muscle_group_links;

create policy "log_sub_item_mg_links_select_own"
  on public.log_sub_item_muscle_group_links for select to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_insert_own"
  on public.log_sub_item_muscle_group_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_update_own"
  on public.log_sub_item_muscle_group_links for update to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_mg_links_delete_own"
  on public.log_sub_item_muscle_group_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_muscle_group_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );

-- Variation links: select/update/delete via session ownership;
-- insert also requires tag.user_id = auth.uid()

drop policy if exists "log_item_tag_links_select_own" on public.log_item_tag_links;
drop policy if exists "log_item_tag_links_insert_own" on public.log_item_tag_links;
drop policy if exists "log_item_tag_links_update_own" on public.log_item_tag_links;
drop policy if exists "log_item_tag_links_delete_own" on public.log_item_tag_links;

create policy "log_item_tag_links_select_own"
  on public.log_item_tag_links for select to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tag_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_tag_links_insert_own"
  on public.log_item_tag_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tag_links.log_item_id
        and s.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "log_item_tag_links_update_own"
  on public.log_item_tag_links for update to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tag_links.log_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tag_links.log_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_item_tag_links_delete_own"
  on public.log_item_tag_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_items li
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where li.id = log_item_tag_links.log_item_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "log_sub_item_tag_links_select_own"
  on public.log_sub_item_tag_links;
drop policy if exists "log_sub_item_tag_links_insert_own"
  on public.log_sub_item_tag_links;
drop policy if exists "log_sub_item_tag_links_update_own"
  on public.log_sub_item_tag_links;
drop policy if exists "log_sub_item_tag_links_delete_own"
  on public.log_sub_item_tag_links;

create policy "log_sub_item_tag_links_select_own"
  on public.log_sub_item_tag_links for select to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tag_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tag_links_insert_own"
  on public.log_sub_item_tag_links for insert to authenticated
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tag_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
    and exists (
      select 1 from public.analytics_tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tag_links_update_own"
  on public.log_sub_item_tag_links for update to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tag_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tag_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );
create policy "log_sub_item_tag_links_delete_own"
  on public.log_sub_item_tag_links for delete to authenticated
  using (
    exists (
      select 1 from public.log_sub_items lsi
      join public.log_items li on li.id = lsi.log_item_id
      join public.log_blocks b on b.id = li.log_block_id
      join public.session_logs s on s.id = b.session_log_id
      where lsi.id = log_sub_item_tag_links.log_sub_item_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.session_logs to authenticated;
grant select, insert, update, delete on public.log_blocks to authenticated;
grant select, insert, update, delete on public.log_items to authenticated;
grant select, insert, update, delete on public.log_sub_items to authenticated;
grant select, insert, update, delete on public.log_sets to authenticated;
grant select, insert, update, delete on public.log_item_tools to authenticated;
grant select, insert, update, delete on public.log_sub_item_tools to authenticated;
grant select, insert, update, delete
  on public.log_item_primary_group_links to authenticated;
grant select, insert, update, delete
  on public.log_sub_item_primary_group_links to authenticated;
grant select, insert, update, delete
  on public.log_item_muscle_group_links to authenticated;
grant select, insert, update, delete
  on public.log_sub_item_muscle_group_links to authenticated;
grant select, insert, update, delete on public.log_item_tag_links to authenticated;
grant select, insert, update, delete
  on public.log_sub_item_tag_links to authenticated;

-- ===========================================================================
-- Insights fact layer (canonical time/distance + flattened set view)
-- Additive: helpers + read-only view only. Safe to re-run.
-- Credit-each arrays must never be summed into one grand total.
-- ===========================================================================

-- HH:MM:SS → seconds (NULL on bad/blank so AVG/SUM stay honest).
create or replace function public.ol_hms_to_seconds(hms text)
returns integer
language sql
immutable
as $$
  select case
    when hms is null then null
    when hms !~ '^\d{1,2}:\d{2}:\d{2}$' then null
    else
      split_part(hms, ':', 1)::int * 3600
      + split_part(hms, ':', 2)::int * 60
      + split_part(hms, ':', 3)::int
  end
$$;

comment on function public.ol_hms_to_seconds(text) is
  'HH:MM:SS text → seconds (NULL on bad/blank). Immutable; used by v_log_set_facts.';

-- Distance value + unit → meters (m/km/mi). Unknown unit → NULL.
create or replace function public.ol_distance_to_meters(value numeric, unit text)
returns numeric
language sql
immutable
as $$
  select case
    when value is null then null
    when unit = 'm' then value
    when unit = 'km' then value * 1000
    when unit = 'mi' then value * 1609.344
    else null
  end
$$;

comment on function public.ol_distance_to_meters(numeric, text) is
  'Distance value+unit (m/km/mi) → meters (NULL on unknown unit). Immutable.';

create or replace view public.v_log_set_facts as
select
  s.id                                        as set_id,
  sess.user_id                                as user_id,
  sess.id                                     as session_log_id,
  sess.session_date                           as session_date,
  sess.status                                 as session_status,
  sess.category_id                            as session_category_id,
  blk.id                                      as block_id,
  blk.label_id                                as block_label_id,
  ci.label_id                                 as sequence_label_id,
  (s.log_sub_item_id is not null)             as is_sub_item,
  coalesce(s.track_analytics, i.track_analytics, si.track_analytics)
                                              as track_analytics,
  coalesce(i.primary_group_id, si.primary_group_id)
                                              as primary_group_id,
  s.set_type                                  as set_type,
  s.intensity                                 as intensity,
  s.reps                                      as reps,
  s.is_per_side                               as is_per_side,
  case
    when s.reps is null or s.reps <= 0 then 0
    else s.reps * (case when s.is_per_side then 2 else 1 end)
  end                                         as effective_reps,
  s.load_value                                as load_value,
  s.load_unit                                 as load_unit,
  case
    when s.reps is null or s.reps <= 0 then 0
    when s.load_value is null or s.load_value <= 0 then 0
    when s.load_unit not in ('lbs', 'kg') then 0
    else s.load_value * (s.reps * (case when s.is_per_side then 2 else 1 end))
  end                                         as tonnage,
  public.ol_hms_to_seconds(s.time_duration)   as time_seconds,
  public.ol_distance_to_meters(s.distance_value, s.distance_unit)
                                              as distance_meters,
  public.ol_hms_to_seconds(sess.duration)     as session_duration_seconds,
  public.ol_hms_to_seconds(blk.duration)      as block_duration_seconds,
  public.ol_hms_to_seconds(coalesce(i.duration, ci.duration))
                                              as item_duration_seconds,
  case when s.log_item_id is not null then (
    select array_agg(l.primary_group_id order by l.sort_order)
    from public.log_item_primary_group_links l
    where l.log_item_id = s.log_item_id
  ) else (
    select array_agg(l.primary_group_id order by l.sort_order)
    from public.log_sub_item_primary_group_links l
    where l.log_sub_item_id = s.log_sub_item_id
  ) end                                       as primary_group_ids,
  case when s.log_item_id is not null then (
    select array_agg(l.muscle_group_id order by l.sort_order)
    from public.log_item_muscle_group_links l
    where l.log_item_id = s.log_item_id
  ) else (
    select array_agg(l.muscle_group_id order by l.sort_order)
    from public.log_sub_item_muscle_group_links l
    where l.log_sub_item_id = s.log_sub_item_id
  ) end                                       as muscle_group_ids,
  case when s.log_item_id is not null then (
    select array_agg(l.tag_id order by l.sort_order)
    from public.log_item_tag_links l
    where l.log_item_id = s.log_item_id
  ) else (
    select array_agg(l.tag_id order by l.sort_order)
    from public.log_sub_item_tag_links l
    where l.log_sub_item_id = s.log_sub_item_id
  ) end                                       as variation_ids,
  case when s.log_item_id is not null then (
    select array_agg(l.tool_id order by l.sort_order)
    from public.log_item_tools l
    where l.log_item_id = s.log_item_id
  ) else (
    select array_agg(l.tool_id order by l.sort_order)
    from public.log_sub_item_tools l
    where l.log_sub_item_id = s.log_sub_item_id
  ) end                                       as tool_ids
from public.log_sets s
left join public.log_items i        on i.id  = s.log_item_id
left join public.log_sub_items si   on si.id = s.log_sub_item_id
left join public.log_items ci       on ci.id = si.log_item_id
join public.log_blocks blk          on blk.id = coalesce(i.log_block_id, ci.log_block_id)
join public.session_logs sess       on sess.id = blk.session_log_id;

alter view public.v_log_set_facts set (security_invoker = on);

comment on view public.v_log_set_facts is
  'One row per log_set flattened to session/block/sequence labels + exercise '
  'identity (PG/muscle/variation/tool arrays). Insights grain source. '
  'Credit-each arrays must never be summed into one total.';

grant select on public.v_log_set_facts to authenticated;

notify pgrst, 'reload schema';
