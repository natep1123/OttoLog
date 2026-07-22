-- OttoLog PERSONAL TEST SEED — Murph smoke test (ONE account only)
-- ===========================================================================
-- NOT a global New-User-Seeds dump. NOT a canonical greenfield migration.
-- Seeds one account's library (exercise / sequence / block / session templates)
-- PLUS one completed session_log denested into the greenfield log tables so
-- Insights has real facts.
--
-- Schema: greenfield only (sql/greenfield/001–007 must already be applied).
-- Docs:   docs/Database_Outline.md, docs/New_User_Seeds.md,
--         docs/Analytics_Labeling.md, docs/Label_Library.md
--
-- Safe-ish to re-run: deletes this seed's own rows by name first (log tree
-- cascades), then recreates. It never touches global sentinels and only ever
-- writes rows owned by the resolved user.
--
-- HOW TO POINT IT AT YOUR ACCOUNT (pick one):
--   • leave v_user null and keep v_username = 'n8.perry' (resolved from public.users), OR
--   • paste your auth uuid into v_user below  /* set me */
-- ===========================================================================

do $$
declare
  ------------------------------------------------------------------ user
  v_user      uuid := null;          /* set me: paste auth uuid to override */
  v_username  text := 'n8.perry';    -- used only when v_user is null

  ------------------------------------------------------------------ locked atom ids (003)
  c_ts_reps          uuid := '10000000-0000-4000-8000-000000000001';
  c_ts_time          uuid := '10000000-0000-4000-8000-000000000002';
  c_ts_time_distance uuid := '10000000-0000-4000-8000-000000000003';

  ------------------------------------------------------------------ tools
  v_tool_vest  uuid;   -- Weighted Vest
  v_tool_bar   uuid;   -- Straight Bar
  v_tool_tread uuid;   -- Treadmill

  ------------------------------------------------------------------ primary groups (+ category)
  v_pg_gait      uuid; -- Cardio
  v_pg_pullups   uuid; -- Pull
  v_pg_pushups   uuid; -- Push
  v_pg_squats    uuid; -- Lower
  v_pg_deadhangs uuid; -- Pull

  ------------------------------------------------------------------ variations (analytics_tags)
  v_tag_weighted uuid;
  v_tag_running  uuid;
  v_tag_walking  uuid;
  v_tag_incline  uuid;
  v_tag_standard uuid;

  ------------------------------------------------------------------ muscles
  v_mg_lats     uuid;
  v_mg_biceps   uuid;
  v_mg_forearms uuid;
  v_mg_chest    uuid;
  v_mg_triceps  uuid;
  v_mg_delts    uuid;  -- Shoulders
  v_mg_core     uuid;
  v_mg_quads    uuid;
  v_mg_hamglut  uuid;  -- Hamstrings/Glutes

  ------------------------------------------------------------------ labels
  v_cat_hybrid   uuid; -- session_categories
  v_lbl_warmup   uuid; -- block_labels
  v_lbl_challng  uuid; -- block_labels (Challenge)
  v_lbl_cooldown uuid; -- block_labels
  v_lbl_circuit  uuid; -- cluster_labels

  ------------------------------------------------------------------ template ids
  v_et_run      uuid; v_et_pull uuid; v_et_push uuid;
  v_et_squat    uuid; v_et_incl uuid; v_et_dead uuid;
  v_seq_id      uuid; -- cluster_templates (Murph Circuit)
  v_blk_warm_t  uuid; v_blk_chal_t uuid; v_blk_cool_t uuid; -- block_templates
  v_sess_tmpl   uuid; -- session_templates

  ------------------------------------------------------------------ jsonb leaves
  v_ex_incline  jsonb;
  v_ex_run_a    jsonb;
  v_ex_run_b    jsonb;
  v_ex_pullups  jsonb;
  v_ex_pushups  jsonb;
  v_ex_squats   jsonb;
  v_ex_deadhang jsonb;
  v_item_murph  jsonb; -- Murph circuit as a block item (kind=cluster)
  v_sess_warm   jsonb;
  v_sess_chal   jsonb;
  v_sess_cool   jsonb;

  ------------------------------------------------------------------ log row ids
  v_log       uuid := gen_random_uuid();
  v_blk_warm  uuid := gen_random_uuid();
  v_blk_chal  uuid := gen_random_uuid();
  v_blk_cool  uuid := gen_random_uuid();
  v_it_incl   uuid := gen_random_uuid();
  v_it_run_a  uuid := gen_random_uuid();
  v_it_murph  uuid := gen_random_uuid();
  v_it_run_b  uuid := gen_random_uuid();
  v_it_dead   uuid := gen_random_uuid();
  v_sub_pull  uuid := gen_random_uuid();
  v_sub_push  uuid := gen_random_uuid();
  v_sub_squat uuid := gen_random_uuid();
begin
  ------------------------------------------------------------------ 0. resolve user
  if v_user is null then
    select id into v_user from public.users where lower(username) = lower(v_username);
  end if;
  if v_user is null then
    raise exception 'murph seed: could not resolve user (set v_user uuid or fix v_username %)', v_username;
  end if;

  ------------------------------------------------------------------ 1. seed default labels + muscles for this user
  perform public.ensure_default_template_labels(v_user);
  perform public.ensure_default_muscle_groups(v_user);

  ------------------------------------------------------------------ 2. tools (create if missing, active user rows)
  select id into v_tool_vest  from public.tools where user_id = v_user and lower(name) = lower('Weighted Vest') and archived_at is null;
  if v_tool_vest  is null then insert into public.tools(user_id, name) values (v_user, 'Weighted Vest') returning id into v_tool_vest;  end if;
  select id into v_tool_bar   from public.tools where user_id = v_user and lower(name) = lower('Straight Bar') and archived_at is null;
  if v_tool_bar   is null then insert into public.tools(user_id, name) values (v_user, 'Straight Bar') returning id into v_tool_bar;   end if;
  select id into v_tool_tread from public.tools where user_id = v_user and lower(name) = lower('Treadmill') and archived_at is null;
  if v_tool_tread is null then insert into public.tools(user_id, name) values (v_user, 'Treadmill') returning id into v_tool_tread; end if;

  ------------------------------------------------------------------ 3. primary groups (+ category NOT NULL)
  select id into v_pg_gait from public.analytics_primary_groups where user_id = v_user and lower(name) = lower('Gait') and archived_at is null;
  if v_pg_gait is null then insert into public.analytics_primary_groups(user_id, name, category) values (v_user, 'Gait', 'Cardio') returning id into v_pg_gait; end if;
  select id into v_pg_pullups from public.analytics_primary_groups where user_id = v_user and lower(name) = lower('Pullups') and archived_at is null;
  if v_pg_pullups is null then insert into public.analytics_primary_groups(user_id, name, category) values (v_user, 'Pullups', 'Pull') returning id into v_pg_pullups; end if;
  select id into v_pg_pushups from public.analytics_primary_groups where user_id = v_user and lower(name) = lower('Pushups') and archived_at is null;
  if v_pg_pushups is null then insert into public.analytics_primary_groups(user_id, name, category) values (v_user, 'Pushups', 'Push') returning id into v_pg_pushups; end if;
  select id into v_pg_squats from public.analytics_primary_groups where user_id = v_user and lower(name) = lower('Squats') and archived_at is null;
  if v_pg_squats is null then insert into public.analytics_primary_groups(user_id, name, category) values (v_user, 'Squats', 'Lower') returning id into v_pg_squats; end if;
  select id into v_pg_deadhangs from public.analytics_primary_groups where user_id = v_user and lower(name) = lower('Deadhangs') and archived_at is null;
  if v_pg_deadhangs is null then insert into public.analytics_primary_groups(user_id, name, category) values (v_user, 'Deadhangs', 'Pull') returning id into v_pg_deadhangs; end if;

  ------------------------------------------------------------------ 4. variations (analytics_tags — product term "Variations")
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

  ------------------------------------------------------------------ 5. resolve seeded muscles + labels
  select id into v_mg_lats     from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Lats');
  select id into v_mg_biceps   from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Biceps');
  select id into v_mg_forearms from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Forearms');
  select id into v_mg_chest    from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Chest');
  select id into v_mg_triceps  from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Triceps');
  select id into v_mg_delts    from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Shoulders');
  select id into v_mg_core     from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Core');
  select id into v_mg_quads    from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Quads');
  select id into v_mg_hamglut  from public.analytics_muscle_groups where user_id = v_user and lower(name) = lower('Hamstrings/Glutes');

  select id into v_cat_hybrid   from public.session_categories where user_id = v_user and lower(name) = lower('Hybrid')    and archived_at is null;
  select id into v_lbl_warmup   from public.block_labels       where user_id = v_user and lower(name) = lower('Warmup')    and archived_at is null;
  select id into v_lbl_challng  from public.block_labels       where user_id = v_user and lower(name) = lower('Challenge') and archived_at is null;
  select id into v_lbl_cooldown from public.block_labels       where user_id = v_user and lower(name) = lower('Cooldown')  and archived_at is null;
  select id into v_lbl_circuit  from public.cluster_labels     where user_id = v_user and lower(name) = lower('Circuit')   and archived_at is null;

  if v_mg_lats is null or v_mg_biceps is null or v_mg_forearms is null
     or v_mg_chest is null or v_mg_triceps is null or v_mg_delts is null
     or v_mg_core is null or v_mg_quads is null or v_mg_hamglut is null then
    raise exception 'murph seed: muscle groups missing — ensure_default_muscle_groups failed for %', v_user;
  end if;
  if v_cat_hybrid is null or v_lbl_warmup is null or v_lbl_challng is null
     or v_lbl_cooldown is null or v_lbl_circuit is null then
    raise exception 'murph seed: nest labels missing — ensure_default_template_labels failed for %', v_user;
  end if;

  -- Soft PG → variation picker hints (idempotent)
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id)
  select v_pg_gait, t from unnest(array[v_tag_running, v_tag_walking, v_tag_incline, v_tag_weighted]) t
  on conflict do nothing;
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id)
  select v_pg_pullups, v_tag_weighted on conflict do nothing;
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id)
  select v_pg_pushups, v_tag_weighted on conflict do nothing;
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id)
  select v_pg_squats, v_tag_weighted on conflict do nothing;
  insert into public.analytics_primary_group_tag_suggestions(primary_group_id, tag_id)
  select v_pg_deadhangs, v_tag_standard on conflict do nothing;

  ------------------------------------------------------------------ 6. idempotency: drop this seed's own rows first
  delete from public.session_logs      where user_id = v_user and name = 'Murph (test seed)';           -- cascades log tree
  delete from public.session_templates where user_id = v_user and name = 'Murph — Full Session';
  delete from public.block_templates   where user_id = v_user and name in ('Murph — Warmup','Murph — Challenge','Murph — Cooldown');
  delete from public.cluster_templates  where user_id = v_user and name = 'Murph Circuit';
  delete from public.exercise_templates where user_id = v_user and name in
    ('1 mile Weighted Run','Weighted Pullups','Weighted Pushups','Weighted Air Squats','Incline Walking','Deadhangs'); -- cascades links

  -- =========================================================================
  -- 7. EXERCISE TEMPLATES (library) + link tables
  -- =========================================================================

  -- 7a. 1 mile Weighted Run — Gait / Cardio · Time & Distance · vest · Running+Weighted
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, '1 mile Weighted Run', v_tool_vest, c_ts_time_distance, true, true, v_pg_gait,
    jsonb_build_array(jsonb_build_object(
      'set',1,'reps',null,'is_per_side',false,'time_duration','00:08:00',
      'distance_value',1,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_run;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_run, v_tool_vest, 0);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_run, v_pg_gait, 0);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_run, v_tag_running), (v_et_run, v_tag_weighted);

  -- 7b. Weighted Pullups — Pullups / Pull · Reps · Straight Bar + Weighted Vest · Weighted
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, 'Weighted Pullups', v_tool_bar, c_ts_reps, true, true, v_pg_pullups,
    jsonb_build_array(jsonb_build_object(
      'set',1,'reps',5,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_pull;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_pull, v_tool_bar, 0), (v_et_pull, v_tool_vest, 1);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_pull, v_pg_pullups, 0);
  insert into public.exercise_template_muscle_group_links(exercise_template_id, muscle_group_id, sort_order) values (v_et_pull, v_mg_lats, 0), (v_et_pull, v_mg_biceps, 1), (v_et_pull, v_mg_forearms, 2);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_pull, v_tag_weighted);

  -- 7c. Weighted Pushups — Pushups / Push · Reps · vest · Weighted
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, 'Weighted Pushups', v_tool_vest, c_ts_reps, true, true, v_pg_pushups,
    jsonb_build_array(jsonb_build_object(
      'set',1,'reps',10,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_push;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_push, v_tool_vest, 0);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_push, v_pg_pushups, 0);
  insert into public.exercise_template_muscle_group_links(exercise_template_id, muscle_group_id, sort_order) values (v_et_push, v_mg_chest, 0), (v_et_push, v_mg_triceps, 1), (v_et_push, v_mg_delts, 2), (v_et_push, v_mg_core, 3);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_push, v_tag_weighted);

  -- 7d. Weighted Air Squats — Squats / Lower · Reps · vest · Weighted
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, 'Weighted Air Squats', v_tool_vest, c_ts_reps, true, true, v_pg_squats,
    jsonb_build_array(jsonb_build_object(
      'set',1,'reps',15,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_squat;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_squat, v_tool_vest, 0);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_squat, v_pg_squats, 0);
  insert into public.exercise_template_muscle_group_links(exercise_template_id, muscle_group_id, sort_order) values (v_et_squat, v_mg_quads, 0), (v_et_squat, v_mg_hamglut, 1), (v_et_squat, v_mg_core, 2);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_squat, v_tag_weighted);

  -- 7e. Incline Walking — Gait / Cardio · Time & Distance · Treadmill · Walking+Incline
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, 'Incline Walking', v_tool_tread, c_ts_time_distance, true, false, v_pg_gait,
    jsonb_build_array(jsonb_build_object(
      'set',1,'reps',null,'is_per_side',false,'time_duration','00:30:00',
      'distance_value',1.5,'distance_unit','mi','load_value',null,'load_unit','BW',
      'track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_incl;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_incl, v_tool_tread, 0);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_incl, v_pg_gait, 0);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_incl, v_tag_walking), (v_et_incl, v_tag_incline);

  -- 7f. Deadhangs — Deadhangs / Pull · Time · Straight Bar only · Standard · @ BW (3 sets)
  insert into public.exercise_templates
    (user_id, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, default_target_shape)
  values (v_user, 'Deadhangs', v_tool_bar, c_ts_time, true, false, v_pg_deadhangs,
    jsonb_build_array(
      jsonb_build_object('set',1,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null),
      jsonb_build_object('set',2,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null),
      jsonb_build_object('set',3,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null)))
  returning id into v_et_dead;
  insert into public.exercise_template_tool_links(exercise_template_id, tool_id, sort_order) values (v_et_dead, v_tool_bar, 0);
  insert into public.exercise_template_primary_group_links(exercise_template_id, primary_group_id, sort_order) values (v_et_dead, v_pg_deadhangs, 0);
  insert into public.exercise_template_muscle_group_links(exercise_template_id, muscle_group_id, sort_order) values (v_et_dead, v_mg_forearms, 0), (v_et_dead, v_mg_lats, 1);
  insert into public.analytics_tag_links(exercise_template_id, tag_id) values (v_et_dead, v_tag_standard);

  -- =========================================================================
  -- 8. Build reusable JSON exercise leaves (match app content shape exactly)
  -- =========================================================================
  v_ex_incline := jsonb_build_object(
    'kind','exercise','id','ex_incline','name','Incline Walking',
    'tool_id',v_tool_tread,'tool_ids',jsonb_build_array(v_tool_tread),'tool_name',null,
    'target_shape_id',c_ts_time_distance,'track_analytics',true,'track_intensity',false,
    'primary_group_ids',jsonb_build_array(v_pg_gait),'primary_group_id',v_pg_gait,
    'analytics_tag_ids',jsonb_build_array(v_tag_walking,v_tag_incline),
    'muscle_group_ids',jsonb_build_array(),
    'targets',jsonb_build_array(jsonb_build_object(
      'set',1,'reps',null,'is_per_side',false,'time_duration','00:30:00',
      'distance_value',1.5,'distance_unit','mi','load_value',null,'load_unit','BW',
      'track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);

  v_ex_run_a := jsonb_build_object(
    'kind','exercise','id','ex_run_a','name','1 mile Weighted Run',
    'tool_id',v_tool_vest,'tool_ids',jsonb_build_array(v_tool_vest),'tool_name',null,
    'target_shape_id',c_ts_time_distance,'track_analytics',true,'track_intensity',true,
    'primary_group_ids',jsonb_build_array(v_pg_gait),'primary_group_id',v_pg_gait,
    'analytics_tag_ids',jsonb_build_array(v_tag_running,v_tag_weighted),
    'muscle_group_ids',jsonb_build_array(),
    'targets',jsonb_build_array(jsonb_build_object(
      'set',1,'reps',null,'is_per_side',false,'time_duration','00:08:00',
      'distance_value',1,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);
  v_ex_run_b := v_ex_run_a || jsonb_build_object('id', 'ex_run_b');  -- identical leaf, distinct key

  v_ex_pullups := jsonb_build_object(
    'kind','exercise','id','ex_pullups','name','Weighted Pullups',
    'tool_id',v_tool_bar,'tool_ids',jsonb_build_array(v_tool_bar,v_tool_vest),'tool_name',null,
    'target_shape_id',c_ts_reps,'track_analytics',true,'track_intensity',true,
    'primary_group_ids',jsonb_build_array(v_pg_pullups),'primary_group_id',v_pg_pullups,
    'analytics_tag_ids',jsonb_build_array(v_tag_weighted),
    'muscle_group_ids',jsonb_build_array(v_mg_lats,v_mg_biceps,v_mg_forearms),
    'targets',jsonb_build_array(jsonb_build_object(
      'set',1,'reps',5,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);

  v_ex_pushups := jsonb_build_object(
    'kind','exercise','id','ex_pushups','name','Weighted Pushups',
    'tool_id',v_tool_vest,'tool_ids',jsonb_build_array(v_tool_vest),'tool_name',null,
    'target_shape_id',c_ts_reps,'track_analytics',true,'track_intensity',true,
    'primary_group_ids',jsonb_build_array(v_pg_pushups),'primary_group_id',v_pg_pushups,
    'analytics_tag_ids',jsonb_build_array(v_tag_weighted),
    'muscle_group_ids',jsonb_build_array(v_mg_chest,v_mg_triceps,v_mg_delts,v_mg_core),
    'targets',jsonb_build_array(jsonb_build_object(
      'set',1,'reps',10,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);

  v_ex_squats := jsonb_build_object(
    'kind','exercise','id','ex_squats','name','Weighted Air Squats',
    'tool_id',v_tool_vest,'tool_ids',jsonb_build_array(v_tool_vest),'tool_name',null,
    'target_shape_id',c_ts_reps,'track_analytics',true,'track_intensity',true,
    'primary_group_ids',jsonb_build_array(v_pg_squats),'primary_group_id',v_pg_squats,
    'analytics_tag_ids',jsonb_build_array(v_tag_weighted),
    'muscle_group_ids',jsonb_build_array(v_mg_quads,v_mg_hamglut,v_mg_core),
    'targets',jsonb_build_array(jsonb_build_object(
      'set',1,'reps',15,'is_per_side',false,'time_duration',null,
      'distance_value',null,'distance_unit','mi','load_value',20,'load_unit','lbs',
      'track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);

  v_ex_deadhang := jsonb_build_object(
    'kind','exercise','id','ex_deadhang','name','Deadhangs',
    'tool_id',v_tool_bar,'tool_ids',jsonb_build_array(v_tool_bar),'tool_name',null,
    'target_shape_id',c_ts_time,'track_analytics',true,'track_intensity',false,
    'primary_group_ids',jsonb_build_array(v_pg_deadhangs),'primary_group_id',v_pg_deadhangs,
    'analytics_tag_ids',jsonb_build_array(v_tag_standard),
    'muscle_group_ids',jsonb_build_array(v_mg_forearms,v_mg_lats),
    'targets',jsonb_build_array(
      jsonb_build_object('set',1,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null),
      jsonb_build_object('set',2,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null),
      jsonb_build_object('set',3,'reps',null,'is_per_side',false,'time_duration','00:00:30','distance_value',null,'distance_unit','mi','load_value',null,'load_unit','BW','track_analytics',null,'set_type','Working','intensity',null)),
    'track_duration',false,'duration',null,'notes',null);

  -- =========================================================================
  -- 9. SEQUENCE TEMPLATE — Murph Circuit (20 rounds circuit)
  -- =========================================================================
  insert into public.cluster_templates(user_id, name, cluster_type, label_id, content)
  values (v_user, 'Murph Circuit', 'circuit', v_lbl_circuit,
    jsonb_build_object(
      'notes',null,'track_duration',false,'duration',null,'rounds',20,
      'items',jsonb_build_array(v_ex_pullups, v_ex_pushups, v_ex_squats),
      'overrides',jsonb_build_array()))
  returning id into v_seq_id;

  -- Murph circuit as an embedded block item (copied JSON — independence rule)
  v_item_murph := jsonb_build_object(
    'kind','cluster','id','cl_murph','name','Murph Circuit',
    'label_id',v_lbl_circuit,'label_name','Circuit','cluster_type','circuit',
    'notes',null,'track_duration',false,'duration',null,'rounds',20,
    'items',jsonb_build_array(v_ex_pullups, v_ex_pushups, v_ex_squats),
    'overrides',jsonb_build_array());

  -- =========================================================================
  -- 10. BLOCK TEMPLATES (Warmup / Challenge / Cooldown)
  -- =========================================================================
  insert into public.block_templates(user_id, name, label_id, content)
  values (v_user, 'Murph — Warmup', v_lbl_warmup,
    jsonb_build_object('notes',null,'track_duration',false,'duration',null,
      'items',jsonb_build_array(v_ex_incline)))
  returning id into v_blk_warm_t;

  insert into public.block_templates(user_id, name, label_id, content)
  values (v_user, 'Murph — Challenge', v_lbl_challng,
    jsonb_build_object('notes',null,'track_duration',false,'duration',null,
      'items',jsonb_build_array(v_ex_run_a, v_item_murph, v_ex_run_b)))
  returning id into v_blk_chal_t;

  insert into public.block_templates(user_id, name, label_id, content)
  values (v_user, 'Murph — Cooldown', v_lbl_cooldown,
    jsonb_build_object('notes',null,'track_duration',false,'duration',null,
      'items',jsonb_build_array(v_ex_deadhang)))
  returning id into v_blk_cool_t;

  -- =========================================================================
  -- 11. SESSION TEMPLATE — nests the three blocks in order
  -- =========================================================================
  v_sess_warm := jsonb_build_object('kind','block','id','bl_warmup','name','Murph — Warmup',
    'label_id',v_lbl_warmup,'label_name','Warmup','notes',null,'track_duration',false,'duration',null,
    'items',jsonb_build_array(v_ex_incline));
  v_sess_chal := jsonb_build_object('kind','block','id','bl_challenge','name','Murph — Challenge',
    'label_id',v_lbl_challng,'label_name','Challenge','notes',null,'track_duration',false,'duration',null,
    'items',jsonb_build_array(v_ex_run_a, v_item_murph, v_ex_run_b));
  v_sess_cool := jsonb_build_object('kind','block','id','bl_cooldown','name','Murph — Cooldown',
    'label_id',v_lbl_cooldown,'label_name','Cooldown','notes',null,'track_duration',false,'duration',null,
    'items',jsonb_build_array(v_ex_deadhang));

  insert into public.session_templates(user_id, name, category_id, content)
  values (v_user, 'Murph — Full Session', v_cat_hybrid,
    jsonb_build_object('notes',null,'track_duration',false,'duration',null,
      'blocks',jsonb_build_array(v_sess_warm, v_sess_chal, v_sess_cool)))
  returning id into v_sess_tmpl;

  -- =========================================================================
  -- 12. SESSION LOG — completed, denested into greenfield log tables
  --      (mirrors src/lib/sessionLogs.ts denest so it renests + feeds Insights)
  -- =========================================================================
  insert into public.session_logs(id, user_id, template_id, name, category_id, session_date, notes, track_duration, duration, status)
  values (v_log, v_user, v_sess_tmpl, 'Murph (test seed)', v_cat_hybrid, date '2026-07-21',
    'Seeded Murph smoke-test log.', false, null, 'complete');

  -- blocks
  insert into public.log_blocks(id, session_log_id, block_order, name, label_id, notes, track_duration, duration) values
    (v_blk_warm, v_log, 1, 'Murph — Warmup',    v_lbl_warmup,   null, false, null),
    (v_blk_chal, v_log, 2, 'Murph — Challenge', v_lbl_challng,  null, false, null),
    (v_blk_cool, v_log, 3, 'Murph — Cooldown',  v_lbl_cooldown, null, false, null);

  -- ── Block 1: Warmup → Incline Walking ────────────────────────────────────
  insert into public.log_items(id, log_block_id, item_order, kind, name, track_duration, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id)
  values (v_it_incl, v_blk_warm, 1, 'exercise', 'Incline Walking', false, v_tool_tread, c_ts_time_distance, true, false, v_pg_gait);
  insert into public.log_item_tools(log_item_id, tool_id, sort_order) values (v_it_incl, v_tool_tread, 0);
  insert into public.log_item_primary_group_links(log_item_id, primary_group_id, sort_order) values (v_it_incl, v_pg_gait, 0);
  insert into public.log_item_tag_links(log_item_id, tag_id, sort_order) values (v_it_incl, v_tag_walking, 0), (v_it_incl, v_tag_incline, 1);
  insert into public.log_sets(log_item_id, set_number, reps, is_per_side, time_duration, distance_value, distance_unit, load_value, load_unit, track_analytics, set_type, intensity)
  values (v_it_incl, 1, null, false, '00:30:00', 1.5, 'mi', null, 'BW', null, 'Working', null);

  -- ── Block 2: Challenge → Run · Murph circuit · Run ───────────────────────
  -- 2.1 first 1 mile Weighted Run
  insert into public.log_items(id, log_block_id, item_order, kind, name, track_duration, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id)
  values (v_it_run_a, v_blk_chal, 1, 'exercise', '1 mile Weighted Run', false, v_tool_vest, c_ts_time_distance, true, true, v_pg_gait);
  insert into public.log_item_tools(log_item_id, tool_id, sort_order) values (v_it_run_a, v_tool_vest, 0);
  insert into public.log_item_primary_group_links(log_item_id, primary_group_id, sort_order) values (v_it_run_a, v_pg_gait, 0);
  insert into public.log_item_tag_links(log_item_id, tag_id, sort_order) values (v_it_run_a, v_tag_running, 0), (v_it_run_a, v_tag_weighted, 1);
  insert into public.log_sets(log_item_id, set_number, reps, is_per_side, time_duration, distance_value, distance_unit, load_value, load_unit, track_analytics, set_type, intensity)
  values (v_it_run_a, 1, null, false, '00:08:00', 1, 'mi', 20, 'lbs', null, 'Working', 8);

  -- 2.2 Murph circuit (cluster, 20 rounds)
  insert into public.log_items(id, log_block_id, item_order, kind, name, track_duration, cluster_type, label_id, rounds)
  values (v_it_murph, v_blk_chal, 2, 'cluster', 'Murph Circuit', false, 'circuit', v_lbl_circuit, 20);

  -- 2.2a Weighted Pullups (Straight Bar + Weighted Vest)
  insert into public.log_sub_items(id, log_item_id, sub_item_order, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, track_duration)
  values (v_sub_pull, v_it_murph, 1, 'Weighted Pullups', v_tool_bar, c_ts_reps, true, true, v_pg_pullups, false);
  insert into public.log_sub_item_tools(log_sub_item_id, tool_id, sort_order) values (v_sub_pull, v_tool_bar, 0), (v_sub_pull, v_tool_vest, 1);
  insert into public.log_sub_item_primary_group_links(log_sub_item_id, primary_group_id, sort_order) values (v_sub_pull, v_pg_pullups, 0);
  insert into public.log_sub_item_muscle_group_links(log_sub_item_id, muscle_group_id, sort_order) values (v_sub_pull, v_mg_lats, 0), (v_sub_pull, v_mg_biceps, 1), (v_sub_pull, v_mg_forearms, 2);
  insert into public.log_sub_item_tag_links(log_sub_item_id, tag_id, sort_order) values (v_sub_pull, v_tag_weighted, 0);
  insert into public.log_sets(log_sub_item_id, set_number, reps, is_per_side, load_value, load_unit, track_analytics, set_type, intensity)
  select v_sub_pull, g, 5, false, 20, 'lbs', null, 'Working', 8 from generate_series(1, 20) g;

  -- 2.2b Weighted Pushups
  insert into public.log_sub_items(id, log_item_id, sub_item_order, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, track_duration)
  values (v_sub_push, v_it_murph, 2, 'Weighted Pushups', v_tool_vest, c_ts_reps, true, true, v_pg_pushups, false);
  insert into public.log_sub_item_tools(log_sub_item_id, tool_id, sort_order) values (v_sub_push, v_tool_vest, 0);
  insert into public.log_sub_item_primary_group_links(log_sub_item_id, primary_group_id, sort_order) values (v_sub_push, v_pg_pushups, 0);
  insert into public.log_sub_item_muscle_group_links(log_sub_item_id, muscle_group_id, sort_order) values (v_sub_push, v_mg_chest, 0), (v_sub_push, v_mg_triceps, 1), (v_sub_push, v_mg_delts, 2), (v_sub_push, v_mg_core, 3);
  insert into public.log_sub_item_tag_links(log_sub_item_id, tag_id, sort_order) values (v_sub_push, v_tag_weighted, 0);
  insert into public.log_sets(log_sub_item_id, set_number, reps, is_per_side, load_value, load_unit, track_analytics, set_type, intensity)
  select v_sub_push, g, 10, false, 20, 'lbs', null, 'Working', 8 from generate_series(1, 20) g;

  -- 2.2c Weighted Air Squats
  insert into public.log_sub_items(id, log_item_id, sub_item_order, name, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id, track_duration)
  values (v_sub_squat, v_it_murph, 3, 'Weighted Air Squats', v_tool_vest, c_ts_reps, true, true, v_pg_squats, false);
  insert into public.log_sub_item_tools(log_sub_item_id, tool_id, sort_order) values (v_sub_squat, v_tool_vest, 0);
  insert into public.log_sub_item_primary_group_links(log_sub_item_id, primary_group_id, sort_order) values (v_sub_squat, v_pg_squats, 0);
  insert into public.log_sub_item_muscle_group_links(log_sub_item_id, muscle_group_id, sort_order) values (v_sub_squat, v_mg_quads, 0), (v_sub_squat, v_mg_hamglut, 1), (v_sub_squat, v_mg_core, 2);
  insert into public.log_sub_item_tag_links(log_sub_item_id, tag_id, sort_order) values (v_sub_squat, v_tag_weighted, 0);
  insert into public.log_sets(log_sub_item_id, set_number, reps, is_per_side, load_value, load_unit, track_analytics, set_type, intensity)
  select v_sub_squat, g, 15, false, 20, 'lbs', null, 'Working', 8 from generate_series(1, 20) g;

  -- 2.3 second 1 mile Weighted Run
  insert into public.log_items(id, log_block_id, item_order, kind, name, track_duration, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id)
  values (v_it_run_b, v_blk_chal, 3, 'exercise', '1 mile Weighted Run', false, v_tool_vest, c_ts_time_distance, true, true, v_pg_gait);
  insert into public.log_item_tools(log_item_id, tool_id, sort_order) values (v_it_run_b, v_tool_vest, 0);
  insert into public.log_item_primary_group_links(log_item_id, primary_group_id, sort_order) values (v_it_run_b, v_pg_gait, 0);
  insert into public.log_item_tag_links(log_item_id, tag_id, sort_order) values (v_it_run_b, v_tag_running, 0), (v_it_run_b, v_tag_weighted, 1);
  insert into public.log_sets(log_item_id, set_number, reps, is_per_side, time_duration, distance_value, distance_unit, load_value, load_unit, track_analytics, set_type, intensity)
  values (v_it_run_b, 1, null, false, '00:08:00', 1, 'mi', 20, 'lbs', null, 'Working', 8);

  -- ── Block 3: Cooldown → Deadhangs 3×30s @ BW ─────────────────────────────
  insert into public.log_items(id, log_block_id, item_order, kind, name, track_duration, tool_id, target_shape_id, track_analytics, track_intensity, primary_group_id)
  values (v_it_dead, v_blk_cool, 1, 'exercise', 'Deadhangs', false, v_tool_bar, c_ts_time, true, false, v_pg_deadhangs);
  insert into public.log_item_tools(log_item_id, tool_id, sort_order) values (v_it_dead, v_tool_bar, 0);
  insert into public.log_item_primary_group_links(log_item_id, primary_group_id, sort_order) values (v_it_dead, v_pg_deadhangs, 0);
  insert into public.log_item_muscle_group_links(log_item_id, muscle_group_id, sort_order) values (v_it_dead, v_mg_forearms, 0), (v_it_dead, v_mg_lats, 1);
  insert into public.log_item_tag_links(log_item_id, tag_id, sort_order) values (v_it_dead, v_tag_standard, 0);
  insert into public.log_sets(log_item_id, set_number, reps, is_per_side, time_duration, distance_value, distance_unit, load_value, load_unit, track_analytics, set_type, intensity)
  select v_it_dead, g, null, false, '00:00:30', null, null, null, 'BW', null, 'Working', null from generate_series(1, 3) g;

  raise notice 'Murph seed complete for user %: 6 exercise templates, 1 sequence, 3 blocks, 1 session, 1 completed log (66 sets).', v_user;
end $$;
