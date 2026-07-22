-- Murph smoke — thicken PG → variation suggestions ONLY (no template/log wipe)
-- ===========================================================================
-- Run on the OttoLog greenfield project for n8.perry (or set v_user).
-- Safe to re-run: creates missing variation tags, replace-writes suggestions
-- for Gait / Pullups / Pushups / Squats / Deadhangs only.
-- Same lean subsets as murph_personal_seed.sql — not Chat 6.
-- ===========================================================================

do $$
declare
  v_user uuid := null;
  v_username text := 'n8.perry';

  v_pg_gait uuid; v_pg_pullups uuid; v_pg_pushups uuid;
  v_pg_squats uuid; v_pg_deadhangs uuid;

  v_tag_weighted uuid; v_tag_running uuid; v_tag_walking uuid;
  v_tag_incline uuid; v_tag_standard uuid; v_tag_wide_grip uuid;
  v_tag_assisted uuid; v_tag_sprinting uuid; v_tag_hiking uuid;
  v_tag_trail uuid; v_tag_intervals uuid; v_tag_goblet uuid;
  v_tag_box uuid; v_tag_diamond uuid; v_tag_single_arm uuid;
begin
  if v_user is null then
    select id into v_user from public.users where lower(username) = lower(v_username);
  end if;
  if v_user is null then
    raise exception 'murph suggestions: could not resolve user %', v_username;
  end if;

  select id into v_pg_gait from public.analytics_primary_groups
    where user_id = v_user and lower(name) = lower('Gait') and archived_at is null;
  select id into v_pg_pullups from public.analytics_primary_groups
    where user_id = v_user and lower(name) = lower('Pullups') and archived_at is null;
  select id into v_pg_pushups from public.analytics_primary_groups
    where user_id = v_user and lower(name) = lower('Pushups') and archived_at is null;
  select id into v_pg_squats from public.analytics_primary_groups
    where user_id = v_user and lower(name) = lower('Squats') and archived_at is null;
  select id into v_pg_deadhangs from public.analytics_primary_groups
    where user_id = v_user and lower(name) = lower('Deadhangs') and archived_at is null;

  if v_pg_gait is null or v_pg_pullups is null or v_pg_pushups is null
     or v_pg_squats is null or v_pg_deadhangs is null then
    raise exception 'murph suggestions: Murph PGs missing — run murph_personal_seed.sql first';
  end if;

  select id into v_tag_weighted from public.analytics_tags where user_id = v_user and lower(name) = lower('Weighted') and archived_at is null;
  if v_tag_weighted is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Weighted') returning id into v_tag_weighted; end if;
  select id into v_tag_running from public.analytics_tags where user_id = v_user and lower(name) = lower('Running') and archived_at is null;
  if v_tag_running is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Running') returning id into v_tag_running; end if;
  select id into v_tag_walking from public.analytics_tags where user_id = v_user and lower(name) = lower('Walking') and archived_at is null;
  if v_tag_walking is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Walking') returning id into v_tag_walking; end if;
  select id into v_tag_incline from public.analytics_tags where user_id = v_user and lower(name) = lower('Incline') and archived_at is null;
  if v_tag_incline is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Incline') returning id into v_tag_incline; end if;
  select id into v_tag_standard from public.analytics_tags where user_id = v_user and lower(name) = lower('Standard') and archived_at is null;
  if v_tag_standard is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Standard') returning id into v_tag_standard; end if;
  select id into v_tag_wide_grip from public.analytics_tags where user_id = v_user and lower(name) = lower('Wide-Grip') and archived_at is null;
  if v_tag_wide_grip is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Wide-Grip') returning id into v_tag_wide_grip; end if;
  select id into v_tag_assisted from public.analytics_tags where user_id = v_user and lower(name) = lower('Assisted') and archived_at is null;
  if v_tag_assisted is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Assisted') returning id into v_tag_assisted; end if;
  select id into v_tag_sprinting from public.analytics_tags where user_id = v_user and lower(name) = lower('Sprinting') and archived_at is null;
  if v_tag_sprinting is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Sprinting') returning id into v_tag_sprinting; end if;
  select id into v_tag_hiking from public.analytics_tags where user_id = v_user and lower(name) = lower('Hiking') and archived_at is null;
  if v_tag_hiking is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Hiking') returning id into v_tag_hiking; end if;
  select id into v_tag_trail from public.analytics_tags where user_id = v_user and lower(name) = lower('Trail') and archived_at is null;
  if v_tag_trail is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Trail') returning id into v_tag_trail; end if;
  select id into v_tag_intervals from public.analytics_tags where user_id = v_user and lower(name) = lower('Intervals') and archived_at is null;
  if v_tag_intervals is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Intervals') returning id into v_tag_intervals; end if;
  select id into v_tag_goblet from public.analytics_tags where user_id = v_user and lower(name) = lower('Goblet') and archived_at is null;
  if v_tag_goblet is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Goblet') returning id into v_tag_goblet; end if;
  select id into v_tag_box from public.analytics_tags where user_id = v_user and lower(name) = lower('Box') and archived_at is null;
  if v_tag_box is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Box') returning id into v_tag_box; end if;
  select id into v_tag_diamond from public.analytics_tags where user_id = v_user and lower(name) = lower('Diamond') and archived_at is null;
  if v_tag_diamond is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Diamond') returning id into v_tag_diamond; end if;
  select id into v_tag_single_arm from public.analytics_tags where user_id = v_user and lower(name) = lower('Single-Arm') and archived_at is null;
  if v_tag_single_arm is null then insert into public.analytics_tags(user_id, name) values (v_user, 'Single-Arm') returning id into v_tag_single_arm; end if;

  delete from public.analytics_primary_group_tag_suggestions
  where primary_group_id in (
    v_pg_gait, v_pg_pullups, v_pg_pushups, v_pg_squats, v_pg_deadhangs
  );

  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id, sort_order)
  select v_pg_gait, t, ord::int from unnest(array[
    v_tag_walking, v_tag_running, v_tag_sprinting, v_tag_hiking,
    v_tag_trail, v_tag_intervals, v_tag_incline, v_tag_weighted
  ]) with ordinality as u(t, ord);
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id, sort_order)
  select v_pg_pullups, t, ord::int from unnest(array[
    v_tag_standard, v_tag_wide_grip, v_tag_weighted, v_tag_assisted
  ]) with ordinality as u(t, ord);
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id, sort_order)
  select v_pg_pushups, t, ord::int from unnest(array[
    v_tag_standard, v_tag_wide_grip, v_tag_diamond, v_tag_incline, v_tag_weighted
  ]) with ordinality as u(t, ord);
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id, sort_order)
  select v_pg_squats, t, ord::int from unnest(array[
    v_tag_standard, v_tag_goblet, v_tag_box, v_tag_weighted
  ]) with ordinality as u(t, ord);
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id, sort_order)
  select v_pg_deadhangs, t, ord::int from unnest(array[
    v_tag_standard, v_tag_wide_grip, v_tag_weighted, v_tag_single_arm
  ]) with ordinality as u(t, ord);
end $$;
