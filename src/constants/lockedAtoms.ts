/**
 * Fixed UUIDs for OttoLog locked atoms.
 * Must match sql/003_locked_atoms.sql seeds.
 *
 * target_shapes = which set/target input fields an exercise uses
 * (not session categories, not tree kind).
 */

export const TARGET_SHAPE_IDS = {
  reps: '10000000-0000-4000-8000-000000000001',
  time: '10000000-0000-4000-8000-000000000002',
  timeAndDistance: '10000000-0000-4000-8000-000000000003',
  timeAndReps: '10000000-0000-4000-8000-000000000004',
  distance: '10000000-0000-4000-8000-000000000005',
} as const;

export const LOAD_UNIT_IDS = {
  lbs: '20000000-0000-4000-8000-000000000001',
  kg: '20000000-0000-4000-8000-000000000002',
  bw: '20000000-0000-4000-8000-000000000003',
} as const;

export const DISTANCE_UNIT_IDS = {
  mi: '30000000-0000-4000-8000-000000000001',
  km: '30000000-0000-4000-8000-000000000002',
  m: '30000000-0000-4000-8000-000000000003',
} as const;
