/**
 * Session log — same nested draft shape as session templates, plus
 * session_date / status / optional template_id. Persisted relationally
 * via denest in `src/lib/sessionLogs.ts` (sql/014).
 */

import type { SessionBlockItem, SessionTemplateInput } from './sessionTemplate';

export type SessionLogStatus = 'draft' | 'complete';

/** Editable log draft: template tree + log-only header fields. */
export type SessionLogInput = SessionTemplateInput & {
  /** Local calendar date YYYY-MM-DD (drives analytics attribution). */
  session_date: string;
  status: SessionLogStatus;
  /** Optional source session template id when seeded from library. */
  template_id?: string | null;
};

export type SessionLogListRow = {
  id: string;
  user_id: string;
  name: string | null;
  category_id: string;
  label_name?: string | null;
  session_date: string;
  status: SessionLogStatus;
  template_id: string | null;
  notes: string | null;
  track_duration: boolean;
  duration: string | null;
  block_count: number;
  /** 1-based ordinal among this user's logs on the same session_date. */
  same_day_ordinal: number;
  created_at: string;
  updated_at: string;
};

export type SessionLogDetail = SessionLogListRow & {
  blocks: SessionBlockItem[];
};

export type { SessionBlockItem };
