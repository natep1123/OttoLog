-- OttoLog Migration L — Empty session labels (Rest)
-- Requires: 004_taxonomy, 012_standard_sequence_label (ensure_default_template_labels)
--
-- Adds is_empty on session_categories so labels like Rest forbid blocks
-- (notes still allowed). Rest is a normal user-seeded default, not a system null.

alter table public.session_categories
  add column if not exists is_empty boolean not null default false;

-- System null Session stays non-empty (unclassified ≠ Rest)
update public.session_categories
set is_empty = false
where id = '40000000-0000-4000-8000-000000000002'
  and is_system_default = true;

create or replace function public.ensure_default_template_labels(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'ensure_default_template_labels: user id required';
  end if;

  -- Non-empty session labels
  insert into public.session_categories (user_id, name, is_system_default, is_empty)
  select p_user_id, v.name, false, false
  from (values
    ('Cardio'),
    ('Hybrid'),
    ('Martial Arts'),
    ('Mobility'),
    ('Recovery'),
    ('Recreation'),
    ('Strength')
  ) as v(name)
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = lower(v.name)
  );

  -- Rest: deliberate empty day (notes only)
  insert into public.session_categories (user_id, name, is_system_default, is_empty)
  select p_user_id, 'Rest', false, true
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = 'rest'
  );

  -- If Rest already existed without is_empty, mark it empty
  update public.session_categories
  set is_empty = true
  where user_id = p_user_id
    and lower(name) = 'rest'
    and is_system_default = false
    and is_empty = false;

  insert into public.block_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Warmup'),
    ('Workout'),
    ('Cooldown')
  ) as v(name)
  where not exists (
    select 1 from public.block_labels bl
    where bl.user_id = p_user_id and lower(bl.name) = lower(v.name)
  );

  insert into public.cluster_labels (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Superset'),
    ('Circuit')
  ) as v(name)
  where not exists (
    select 1 from public.cluster_labels cl
    where cl.user_id = p_user_id and lower(cl.name) = lower(v.name)
  );
end;
$$;

grant execute on function public.ensure_default_template_labels(uuid)
  to authenticated;

notify pgrst, 'reload schema';
