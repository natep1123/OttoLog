/**
 * Block template — ordered mixed list of exercise/cluster blobs (copied, no FK).
 * label_id is mandatory; name is optional Name/Brief.
 */

import type {
  ClusterExerciseItem,
  ClusterTemplateInput,
} from './clusterTemplate';

/** Cluster embedded inside a block (React key + kind discriminator). */
export type BlockClusterItem = ClusterTemplateInput & {
  kind: 'cluster';
  id: string;
};

/**
 * Standalone exercise embedded directly inside a block.
 * Same leaf shape as cluster exercises (`targets[]`), so denest stays uniform.
 */
export type BlockExerciseItem = ClusterExerciseItem;

export type BlockItem = BlockClusterItem | BlockExerciseItem;

export type BlockContent = {
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: BlockItem[];
};

export type BlockTemplateRow = {
  id: string;
  user_id: string;
  name: string | null;
  label_id: string;
  label_name?: string | null;
  content: BlockContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockTemplateInput = {
  /** Optional Name/Brief */
  name: string;
  label_id: string;
  label_name?: string | null;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: BlockItem[];
};
