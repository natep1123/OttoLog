import dayjs, { type Dayjs } from 'dayjs';

/**
 * Local-device datetime helpers for Home and calendar/log surfaces.
 * dayjs uses the device timezone by default — no UTC conversion needed here.
 */

export type WeekDay = {
  key: string;
  label: string;
  date: number;
  isToday: boolean;
};

/** Live local now from the device clock. */
export function localNow(): Dayjs {
  return dayjs();
}

/** Today's local calendar date as YYYY-MM-DD. */
export function todayDateKey(now: Dayjs = localNow()): string {
  return now.format('YYYY-MM-DD');
}

/**
 * Session log date label — e.g. "Monday, May 5, 2026".
 * Accepts YYYY-MM-DD or a Dayjs instance.
 */
export function formatSessionDateLabel(
  date: string | Dayjs,
): string {
  const d = typeof date === 'string' ? dayjs(date) : date;
  return d.format('dddd, MMMM D, YYYY');
}

/** Shift a YYYY-MM-DD key by ±days in local calendar time. */
export function shiftDateKey(dateKey: string, days: number): string {
  return dayjs(dateKey).add(days, 'day').format('YYYY-MM-DD');
}

/** Parse YYYY-MM-DD to a local Dayjs (start of that day). */
export function dateKeyToDayjs(dateKey: string): Dayjs {
  return dayjs(dateKey).startOf('day');
}

/**
 * Time-of-day greeting from local hour.
 * Late night (10pm–4:59am) stays neutral so midnight is never “Good morning.”
 */
export function greetingForLocalTime(now: Dayjs = localNow()): string {
  const hour = now.hour();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 22) return 'Good evening';
  return 'Hey';
}

/** Monday-start week strip with the live local day highlighted. */
export function localWeekDays(now: Dayjs = localNow()): WeekDay[] {
  const todayKey = now.format('YYYY-MM-DD');
  // dayjs: Sunday = 0 … Saturday = 6 → Monday-start offset
  const mondayOffset = (now.day() + 6) % 7;
  const monday = now.startOf('day').subtract(mondayOffset, 'day');
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

  return labels.map((label, index) => {
    const day = monday.add(index, 'day');
    const key = day.format('YYYY-MM-DD');
    return {
      key,
      label,
      date: day.date(),
      isToday: key === todayKey,
    };
  });
}
