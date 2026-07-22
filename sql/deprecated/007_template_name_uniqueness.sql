-- OttoLog Migration E — Template name uniqueness (run in Supabase SQL Editor)
-- Per docs/Database_Outline.md § Templates
--
-- Requires: 006_exercise_templates
--
-- Enforces unique active template names per user (case-insensitive), mirroring
-- the taxonomy pattern in 004/005. Archived rows are excluded so a name frees up
-- once its template is archived. Future session/block/cluster template tables
-- should adopt the same per-layer partial unique index when they ship.

create unique index if not exists exercise_templates_user_name_unique
  on public.exercise_templates (user_id, lower(name))
  where archived_at is null;
