-- OttoLog Migration A — Locked atoms (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Locked Atoms
-- Global, no user_id. Authenticated users may SELECT only.
--
-- target_shapes = which set/target INPUT FIELDS an exercise uses
-- (Reps, Time, Distance, …). Not session categories. Not tree kind.
-- FK on exercises: target_shape_id
--
-- Fixed UUIDs (also mirrored in src/constants/lockedAtoms.ts)

-- target_shapes
--   Reps                10000000-0000-4000-8000-000000000001
--   Time                10000000-0000-4000-8000-000000000002
--   Time & Distance     10000000-0000-4000-8000-000000000003
--   Time & Reps         10000000-0000-4000-8000-000000000004
--   Distance            10000000-0000-4000-8000-000000000005

-- load_units
--   lbs                 20000000-0000-4000-8000-000000000001
--   kg                  20000000-0000-4000-8000-000000000002
--   BW                  20000000-0000-4000-8000-000000000003

-- distance_units
--   mi                  30000000-0000-4000-8000-000000000001
--   km                  30000000-0000-4000-8000-000000000002
--   m                   30000000-0000-4000-8000-000000000003

create table if not exists public.target_shapes (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint target_shapes_name_unique unique (name)
);

create table if not exists public.load_units (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint load_units_name_unique unique (name)
);

create table if not exists public.distance_units (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint distance_units_name_unique unique (name)
);

-- Seed (idempotent)

insert into public.target_shapes (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Reps'),
  ('10000000-0000-4000-8000-000000000002', 'Time'),
  ('10000000-0000-4000-8000-000000000003', 'Time & Distance'),
  ('10000000-0000-4000-8000-000000000004', 'Time & Reps'),
  ('10000000-0000-4000-8000-000000000005', 'Distance')
on conflict (id) do nothing;

insert into public.load_units (id, name) values
  ('20000000-0000-4000-8000-000000000001', 'lbs'),
  ('20000000-0000-4000-8000-000000000002', 'kg'),
  ('20000000-0000-4000-8000-000000000003', 'BW')
on conflict (id) do nothing;

insert into public.distance_units (id, name) values
  ('30000000-0000-4000-8000-000000000001', 'mi'),
  ('30000000-0000-4000-8000-000000000002', 'km'),
  ('30000000-0000-4000-8000-000000000003', 'm')
on conflict (id) do nothing;

-- RLS: read-only for authenticated

alter table public.target_shapes enable row level security;
alter table public.load_units enable row level security;
alter table public.distance_units enable row level security;

drop policy if exists "target_shapes_select_authenticated" on public.target_shapes;
drop policy if exists "load_units_select_authenticated" on public.load_units;
drop policy if exists "distance_units_select_authenticated" on public.distance_units;

create policy "target_shapes_select_authenticated"
  on public.target_shapes for select
  to authenticated
  using (true);

create policy "load_units_select_authenticated"
  on public.load_units for select
  to authenticated
  using (true);

create policy "distance_units_select_authenticated"
  on public.distance_units for select
  to authenticated
  using (true);

grant select on public.target_shapes to authenticated;
grant select on public.load_units to authenticated;
grant select on public.distance_units to authenticated;

notify pgrst, 'reload schema';
