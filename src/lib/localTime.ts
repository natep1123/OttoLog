import dayjs, { type Dayjs } from 'dayjs';

/**
 * Local-device datetime helpers for Home and future calendar/log surfaces.
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
