-- Rename the sequence-label system null after 011 has already been applied.
-- Internal table/function names retain "cluster" for schema compatibility.

update public.cluster_labels
set name = 'Standard'
where id = '60000000-0000-4000-8000-000000000001'
  and is_system_default = true
  and user_id is null;

-- Keep Standard stable. Superset and Circuit remain editable user defaults;
-- the legacy cluster_type column must not silently remap the system-null label.
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

  insert into public.session_categories (user_id, name, is_system_default)
  select p_user_id, v.name, false
  from (values
    ('Strength'),
    ('Cardio'),
    ('Hybrid'),
    ('Mobility'),
    ('Recovery')
  ) as v(name)
  where not exists (
    select 1 from public.session_categories sc
    where sc.user_id = p_user_id and lower(sc.name) = lower(v.name)
  );

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
