-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Analytics fact layer (chat 5.5 review → 5.7): canonical numeric time/distance
-- + a flattened set-fact reporting view for Insights grains.
-- Requires: 004_taxonomy, 005_analytics, 007_session_logs
--
-- ADDITIVE ONLY. No changes to existing tables, columns, or RLS. This file adds
-- two IMMUTABLE parse helpers and one read-only view. Safe to re-run.
--
-- Grain model: every log_set is one fact carrying its own dimension keys —
-- session label, block label, sequence label, and the exercise identity
-- (primary group / category / muscle / variation / tool). The view lets Insights
-- group by any grain in a single query instead of client-side stitching.
--
-- Credit rule (documented): per-PG / per-category / per-muscle rollups
-- deliberately double-count via the *_ids[] arrays; NEVER sum those into one
-- total. Honest totals (sessions, working sets, tonnage) come from the set grain
-- once (one row per set here). Session/block/sequence labels are honest
-- partitions (each set lives in exactly one).

-- ---------------------------------------------------------------------------
-- Canonical numeric helpers (time + distance)
-- ---------------------------------------------------------------------------

-- HH:MM:SS (or H:MM:SS) text → total seconds. NULL on null/blank/bad format,
-- so AVG/SUM stay honest (nulls excluded, not dragged toward zero).
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

-- Distance value + unit → canonical meters (decision: meters canonical; UI
-- presents mi/km by preference). Unknown units → NULL (never silently mix).
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

-- ---------------------------------------------------------------------------
-- v_log_set_facts — one row per log_set, flattened up the nest tree
-- ---------------------------------------------------------------------------

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
  -- sequence label only exists for sets inside a cluster; NULL for standalone
  ci.label_id                                 as sequence_label_id,
  (s.log_sub_item_id is not null)             as is_sub_item,
  -- effective analytics opt-in: set flag wins, else the owning exercise item
  coalesce(s.track_analytics, i.track_analytics, si.track_analytics)
                                              as track_analytics,
  -- singular "primary" PG (first) for convenience; arrays below for credit-each
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
  -- target-shape set time (kept separate from structural durations below)
  public.ol_hms_to_seconds(s.time_duration)   as time_seconds,
  public.ol_distance_to_meters(s.distance_value, s.distance_unit)
                                              as distance_meters,
  -- structural durations (decision: "minutes" come from these, not set time)
  public.ol_hms_to_seconds(sess.duration)     as session_duration_seconds,
  public.ol_hms_to_seconds(blk.duration)      as block_duration_seconds,
  public.ol_hms_to_seconds(coalesce(i.duration, ci.duration))
                                              as item_duration_seconds,
  -- credit-each dimension arrays (ordered by sort_order)
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

-- Run the view with the querying user's privileges so RLS on the underlying
-- log tables applies (each user sees only their own sets). PG15+ / Supabase.
alter view public.v_log_set_facts set (security_invoker = on);

comment on view public.v_log_set_facts is
  'One row per log_set flattened to session/block/sequence labels + exercise '
  'identity (PG/category via join, muscle/variation/tool arrays). Insights '
  'grain source. Credit-each arrays must never be summed into one total.';

grant select on public.v_log_set_facts to authenticated;

notify pgrst, 'reload schema';
