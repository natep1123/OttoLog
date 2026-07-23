/**
 * Query frame **IN** presets (madlib author, slice 2.5). Rolling windows
 * computed from the device clock; "Custom" reveals the existing From/To
 * pickers. No new AST field — `QueryDraft.window` stays `{ fromDate, toDate }`
 * (a pinned pair); presets are a pure UI convenience over that same shape.
 * See `docs/Insights_Query_Builder.md` §2.1.
 */

import dayjs from 'dayjs';
import { daysAgoKey, type QueryWindow } from '../../lib/insights';
import { todayDateKey } from '../../lib/localTime';

export type WindowPreset = 'last7' | 'last28' | 'thisWeek' | 'custom';

export const WINDOW_PRESET_OPTIONS: { id: Exclude<WindowPreset, 'custom'>; label: string }[] =
  [
    { id: 'last7', label: 'Last 7' },
    { id: 'last28', label: 'Last 28' },
    { id: 'thisWeek', label: 'This week' },
  ];

/** Monday of the current local week, as a date key. */
function mondayKey(): string {
  const now = dayjs();
  const mondayOffset = (now.day() + 6) % 7;
  return now.subtract(mondayOffset, 'day').format('YYYY-MM-DD');
}

/** Compute the concrete window for a rolling preset, ending today. */
export function presetWindow(
  preset: Exclude<WindowPreset, 'custom'>,
): QueryWindow {
  const toDate = todayDateKey();
  switch (preset) {
    case 'last7':
      return { fromDate: daysAgoKey(6), toDate };
    case 'last28':
      return { fromDate: daysAgoKey(27), toDate };
    case 'thisWeek':
      return { fromDate: mondayKey(), toDate };
  }
}

/** Which preset (if any) the current window matches; "custom" otherwise. */
export function matchWindowPreset(window: QueryWindow): WindowPreset {
  if (window.toDate !== todayDateKey()) return 'custom';
  if (window.fromDate === daysAgoKey(6)) return 'last7';
  if (window.fromDate === daysAgoKey(27)) return 'last28';
  if (window.fromDate === mondayKey()) return 'thisWeek';
  return 'custom';
}
