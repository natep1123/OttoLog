/**
 * Which target/set columns each target_shape shows in the editor.
 * No SQL — UI map only. IDs must match sql/003_locked_atoms.sql / lockedAtoms.ts.
 *
 * Load is always available; volume columns vary by shape.
 */

import { TARGET_SHAPE_IDS } from './lockedAtoms';

export type TargetVolumeField =
  | 'reps'
  | 'is_per_side'
  | 'time_duration'
  | 'distance_value'
  | 'distance_unit';

export type TargetLoadField = 'load_value' | 'load_unit';

export type TargetField = TargetVolumeField | TargetLoadField;

export type TargetShapeFields = {
  volume: TargetVolumeField[];
  load: TargetLoadField[];
};

const LOAD: TargetLoadField[] = ['load_value', 'load_unit'];

export const TARGET_SHAPE_LABELS: Record<string, string> = {
  [TARGET_SHAPE_IDS.reps]: 'Reps',
  [TARGET_SHAPE_IDS.time]: 'Time',
  [TARGET_SHAPE_IDS.timeAndDistance]: 'Time & Distance',
  [TARGET_SHAPE_IDS.timeAndReps]: 'Time & Reps',
  [TARGET_SHAPE_IDS.distance]: 'Distance',
};

/** Ordered list for shape pickers */
export const TARGET_SHAPE_OPTIONS = [
  { id: TARGET_SHAPE_IDS.reps, label: TARGET_SHAPE_LABELS[TARGET_SHAPE_IDS.reps] },
  { id: TARGET_SHAPE_IDS.time, label: TARGET_SHAPE_LABELS[TARGET_SHAPE_IDS.time] },
  {
    id: TARGET_SHAPE_IDS.timeAndDistance,
    label: TARGET_SHAPE_LABELS[TARGET_SHAPE_IDS.timeAndDistance],
  },
  {
    id: TARGET_SHAPE_IDS.timeAndReps,
    label: TARGET_SHAPE_LABELS[TARGET_SHAPE_IDS.timeAndReps],
  },
  { id: TARGET_SHAPE_IDS.distance, label: TARGET_SHAPE_LABELS[TARGET_SHAPE_IDS.distance] },
] as const;

export const targetShapeFields: Record<string, TargetShapeFields> = {
  [TARGET_SHAPE_IDS.reps]: {
    volume: ['reps', 'is_per_side'],
    load: LOAD,
  },
  [TARGET_SHAPE_IDS.time]: {
    volume: ['time_duration'],
    load: LOAD,
  },
  [TARGET_SHAPE_IDS.timeAndDistance]: {
    volume: ['time_duration', 'distance_value', 'distance_unit'],
    load: LOAD,
  },
  [TARGET_SHAPE_IDS.timeAndReps]: {
    volume: ['time_duration', 'reps', 'is_per_side'],
    load: LOAD,
  },
  [TARGET_SHAPE_IDS.distance]: {
    volume: ['distance_value', 'distance_unit'],
    load: LOAD,
  },
};

/** Flat field list (volume then load) for a shape */
export function fieldsForTargetShape(targetShapeId: string): TargetField[] {
  const shape = targetShapeFields[targetShapeId];
  if (!shape) return [...LOAD];
  return [...shape.volume, ...shape.load];
}
