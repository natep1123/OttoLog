-- OttoLog Migration K — Multi-tool links for exercises (run in Supabase SQL Editor)
-- Requires: 006_exercise_templates, 014_session_logs
--
-- Mirrors analytics_tag_links: ordered M2M so an exercise can use Rings + Vest, etc.
-- Keeps singular tool_id columns as primary (= first selected) for compatibility.

-- ---------------------------------------------------------------------------
-- exercise_template_tool_links
-- ---------------------------------------------------------------------------

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

-- Backfill from existing singular tool_id
insert into public.exercise_template_tool_links (
  exercise_template_id, tool_id, sort_order
)
select et.id, et.tool_id, 0
from public.exercise_templates et
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- log_item_tools / log_sub_item_tools
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

-- Backfill log tools from singular columns (exercise-kind items only)
insert into public.log_item_tools (log_item_id, tool_id, sort_order)
select li.id, li.tool_id, 0
from public.log_items li
where li.tool_id is not null
on conflict do nothing;

insert into public.log_sub_item_tools (log_sub_item_id, tool_id, sort_order)
select lsi.id, lsi.tool_id, 0
from public.log_sub_items lsi
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.exercise_template_tool_links enable row level security;
alter table public.log_item_tools enable row level security;
alter table public.log_sub_item_tools enable row level security;

drop policy if exists "exercise_template_tool_links_select_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_insert_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_update_own"
  on public.exercise_template_tool_links;
drop policy if exists "exercise_template_tool_links_delete_own"
  on public.exercise_template_tool_links;

create policy "exercise_template_tool_links_select_own"
  on public.exercise_template_tool_links for select
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

create policy "exercise_template_tool_links_insert_own"
  on public.exercise_template_tool_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tools t
      where t.id = tool_id
        and (t.user_id = auth.uid() or t.user_id is null)
    )
  );

create policy "exercise_template_tool_links_update_own"
  on public.exercise_template_tool_links for update
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
      select 1 from public.tools t
      where t.id = tool_id
        and (t.user_id = auth.uid() or t.user_id is null)
    )
  );

create policy "exercise_template_tool_links_delete_own"
  on public.exercise_template_tool_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.exercise_templates et
      where et.id = exercise_template_id
        and et.user_id = auth.uid()
    )
  );

-- log_item_tools: own via session_logs

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

grant select, insert, update, delete on public.exercise_template_tool_links
  to authenticated;
grant select, insert, update, delete on public.log_item_tools to authenticated;
grant select, insert, update, delete on public.log_sub_item_tools
  to authenticated;

notify pgrst, 'reload schema';
