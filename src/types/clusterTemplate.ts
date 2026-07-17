/**
 * Cluster template row + editor draft.
 * content jsonb holds notes/duration/items; name + cluster_type are columns.
 */

import type { ExerciseTarget } from './exerciseTemplate';

export type ClusterType = 'superset' | 'circuit';

export const CLUSTER_TYPE_OPTIONS: { id: ClusterType; label: string }[] = [
  { id: 'superset', label: 'Superset' },
  { id: 'circuit', label: 'Circuit' },
];

export const CLUSTER_TYPE_LABELS: Record<ClusterType, string> = {
  superset: 'Superset',
  circuit: 'Circuit',
};

/** Exercise leaf stored inside cluster content.items[] */
export type ClusterExerciseItem = {
  kind: 'exercise';
  /** Stable id within the blob (React keys / reorder) */
  id: string;
  name: string;
  tool_id: string;
  target_shape_id: string;
  track_analytics: boolean;
  primary_group_id: string | null;
  analytics_tag_ids: string[];
  targets: ExerciseTarget[];
  track_duration: boolean;
  duration: string | null;
  notes: string | null;
};

export type ClusterContent = {
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: ClusterExerciseItem[];
};

export type ClusterTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  cluster_type: ClusterType;
  content: ClusterContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClusterTemplateInput = {
  name: string;
  cluster_type: ClusterType;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: ClusterExerciseItem[];
};
