/**
 * Session template — ordered list of nested block blobs + label (category_id).
 * category_id is the session label FK; name is optional Name/Brief.
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
  name: string | null;
  /** Session label (session_categories.id) — presented as Label in UI */
  category_id: string;
  label_name?: string | null;
  content: SessionContent;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionTemplateInput = {
  /** Optional Name/Brief */
  name: string;
  category_id: string;
  label_name?: string | null;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  blocks: SessionBlockItem[];
};

export type { BlockClusterItem, BlockExerciseItem, BlockItem };
