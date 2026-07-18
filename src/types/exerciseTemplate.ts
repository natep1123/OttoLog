/**
 * Exercise template row + editor target payload.
 * Official FK: target_shape_id (not comp_category_id).
 */

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
};

export type ExerciseTemplateRow = {
  id: string;
  user_id: string;
  /** Optional; blank resolves to tool/order title */
  name: string | null;
  tool_id: string;
  target_shape_id: string;
  track_analytics: boolean;
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
  tool_id: string;
  target_shape_id: string;
  track_analytics: boolean;
  primary_group_id: string | null;
  /** Editor may carry tag ids; persisted via analytics_tag_links */
  analytics_tag_ids: string[];
  default_target_shape: ExerciseTarget[];
  track_duration: boolean;
  duration: string | null;
  notes: string | null;
};

export type ExerciseTemplateWithTags = ExerciseTemplateRow & {
  analytics_tag_ids: string[];
  primary_group_name: string | null;
  tag_names: string[];
};
