/**
 * Exercise template row + editor target payload.
 * Official FK: target_shape_id (not comp_category_id).
 */

import type { SetType } from '../constants/setTypes';

export type DistanceUnitCode = 'mi' | 'km' | 'm';
export type LoadUnitCode = 'lbs' | 'kg' | 'BW';

export type ExerciseTarget = {
  set: number;
  reps: number | null;
  is_per_side: boolean;
  time_duration: string | null;
  distance_value: number | null;
  distance_unit: DistanceUnitCode;
  load_value: number | null;
  load_unit: LoadUnitCode;
  track_analytics: boolean | null;
  /** Greenfield log_sets.set_type; default Working */
  set_type?: SetType;
  /**
   * Greenfield log_sets.intensity. UI 0 = unset; persist NULL (never 0).
   * Half-steps 0.5–10 when set.
   */
  intensity?: number | null;
};

export type ExerciseTemplateRow = {
  id: string;
  user_id: string;
  /** Optional; blank resolves to tool/order title */
  name: string | null;
  /** Primary tool (first in tool_ids) — kept for SQL NOT NULL / compatibility */
  tool_id: string;
  target_shape_id: string;
  track_analytics: boolean;
  /** Opt-in set-row intensity column (greenfield) */
  track_intensity: boolean;
  primary_group_id: string | null;
  default_target_shape: ExerciseTarget[];
  track_duration: boolean;
  duration: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseTemplateInput = {
  /** Optional Name; blank resolves to tool/order title */
  name: string;
  /**
   * Ordered tool ids. Always ≥1 after normalizeToolIds.
   * No Tool is exclusive (real tools clear it; empty → [NO_TOOL_ID]).
   * `tool_id` on save is derived as tool_ids[0].
   */
  tool_ids: string[];
  /** Joined real-tool labels for blank-name display (chips / outline) */
  tool_name?: string | null;
  target_shape_id: string;
  track_analytics: boolean;
  /** More-menu Intensity toggle — gates set-row intensity inputs */
  track_intensity: boolean;
  /**
   * Ordered primary group ids when tracking. Empty when tracking off.
   * `primary_group_id` on save is derived as primary_group_ids[0] (or null).
   */
  primary_group_ids: string[];
  /** Primary (= first) group — kept for SQL CHECK / compatibility */
  primary_group_id: string | null;
  /** Editor may carry tag ids; persisted via analytics_tag_links */
  analytics_tag_ids: string[];
  /** Optional anatomy multiselect; persisted via exercise_template_muscle_group_links */
  muscle_group_ids: string[];
  default_target_shape: ExerciseTarget[];
  track_duration: boolean;
  duration: string | null;
  notes: string | null;
};

export type ExerciseTemplateWithTags = ExerciseTemplateRow & {
  tool_ids: string[];
  tool_names: string[];
  primary_group_ids: string[];
  analytics_tag_ids: string[];
  muscle_group_ids: string[];
  primary_group_name: string | null;
  tag_names: string[];
};
