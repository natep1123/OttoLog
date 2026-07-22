/**
 * Sequence template row + editor draft.
 * Internal identifiers retain "Cluster" for database compatibility.
 * content jsonb: rounds + per-round items + sparse overrides.
 * Expanded individual sets live only in session logs after denest.
 *
 * label_id is the mandatory taxonomy label; name is optional Name/Brief.
 * cluster_type is retained for SQL compatibility (dual-write).
 */

import type {
  DistanceUnitCode,
  ExerciseTarget,
  LoadUnitCode,
} from './exerciseTemplate';

export type ClusterType = 'superset' | 'circuit';

/** @deprecated Prefer label taxonomy; kept for dual-write / legacy rows. */
export const CLUSTER_TYPE_OPTIONS: { id: ClusterType; label: string }[] = [
  { id: 'superset', label: 'Superset' },
  { id: 'circuit', label: 'Circuit' },
];

/** @deprecated Prefer label_name / displayTitles. */
export const CLUSTER_TYPE_LABELS: Record<ClusterType, string> = {
  superset: 'Superset',
  circuit: 'Circuit',
};

/** Exercise leaf stored inside cluster content.items[] (per-round prescription) */
export type ClusterExerciseItem = {
  kind: 'exercise';
  /** Stable id within the blob (React keys / overrides / reorder) */
  id: string;
  /** Optional; blank resolves to tool/order title */
  name: string;
  /** Primary tool — first of tool_ids (compat for older blobs) */
  tool_id: string;
  /** Ordered tools; prefer this over tool_id when present */
  tool_ids?: string[];
  /** Snapshot for display when name is blank (joined tool labels) */
  tool_name?: string | null;
  target_shape_id: string;
  track_analytics: boolean;
  /** Opt-in set-row intensity (greenfield); mirrors exercise templates */
  track_intensity?: boolean;
  /** Ordered primary group ids; prefer this over primary_group_id when present */
  primary_group_ids?: string[];
  /** Primary (= first) group — kept for SQL CHECK / compatibility */
  primary_group_id: string | null;
  analytics_tag_ids: string[];
  /** Optional anatomy multiselect; embedded in nested JSON leaves */
  muscle_group_ids?: string[];
  /** Targets performed once per round (not consecutive solo sets) */
  targets: ExerciseTarget[];
  track_duration: boolean;
  duration: string | null;
  notes: string | null;
};

/** Partial target fields for a round-range override */
export type ClusterOverridePatch = {
  reps?: number | null;
  is_per_side?: boolean;
  time_duration?: string | null;
  distance_value?: number | null;
  distance_unit?: DistanceUnitCode;
  load_value?: number | null;
  load_unit?: LoadUnitCode;
};

/**
 * Exception to the default per-round prescription for a round range.
 * skipped=true means that exercise is omitted for those rounds (not logged as 0-rep sets).
 * notes can exist alone (why / coaching for those rounds) without changing targets.
 * patch fields stay within the exercise's existing target_shape — shape itself is not overridden.
 */
export type ClusterRoundOverride = {
  id: string;
  exercise_id: string;
  from_round: number;
  to_round: number;
  skipped: boolean;
  notes: string | null;
  patch: ClusterOverridePatch;
};

export type ClusterContent = {
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  /** How many times to walk the exercise sequence */
  rounds: number;
  items: ClusterExerciseItem[];
  overrides: ClusterRoundOverride[];
};

export type ClusterTemplateRow = {
  id: string;
  user_id: string;
  /** Optional Name/Brief; null when using generated title */
  name: string | null;
  label_id: string;
  /** Resolved label word when joined/fetched */
  label_name?: string | null;
  /** Legacy dual-write column */
  cluster_type: ClusterType;
  content: ClusterContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClusterTemplateInput = {
  /** Optional Name/Brief */
  name: string;
  label_id: string;
  /** Display snapshot; kept in nested JSON blobs */
  label_name?: string | null;
  /** Dual-write / legacy; derived from label when saving */
  cluster_type: ClusterType;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  rounds: number;
  items: ClusterExerciseItem[];
  overrides: ClusterRoundOverride[];
};

/** One expanded slot after applying rounds + overrides (for future denest / log UI) */
export type ExpandedClusterSet = {
  round: number;
  exercise_id: string;
  exercise_name: string;
  target_index: number;
  target: ExerciseTarget;
  skipped: boolean;
};
