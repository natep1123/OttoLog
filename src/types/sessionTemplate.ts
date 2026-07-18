/**
 * Session template — ordered list of nested block blobs + category.
 */

import type {
  BlockClusterItem,
  BlockExerciseItem,
  BlockItem,
  BlockTemplateInput,
} from './blockTemplate';

/** Block embedded inside a session. */
export type SessionBlockItem = BlockTemplateInput & {
  kind: 'block';
  id: string;
};

export type SessionContent = {
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  blocks: SessionBlockItem[];
};

export type SessionTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  content: SessionContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionTemplateInput = {
  name: string;
  category_id: string;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  blocks: SessionBlockItem[];
};

export type { BlockClusterItem, BlockExerciseItem, BlockItem };
