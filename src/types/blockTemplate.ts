/**
 * Block template — ordered list of nested cluster blobs (copied, no FK).
 */

import type { ClusterTemplateInput } from './clusterTemplate';

/** Cluster embedded inside a block (React key + kind discriminator). */
export type BlockClusterItem = ClusterTemplateInput & {
  kind: 'cluster';
  id: string;
};

export type BlockContent = {
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: BlockClusterItem[];
};

export type BlockTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  content: BlockContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockTemplateInput = {
  name: string;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  items: BlockClusterItem[];
};
