// 日期工具：一律用 'YYYY-MM-DD' 字串表示「使用者時區的某一天」，避免時區錯亂。

export const DEFAULT_TIMEZONE = 'Asia/Taipei';

export type DayKey = string; // 'YYYY-MM-DD'

/** 取得某個時間點在指定時區的日期 */
export function dayKeyOf(date: Date, timeZone: string = DEFAULT_TIMEZONE): DayKey {
  // en-CA 的日期格式剛好是 YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toUtcDate(key: DayKey): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = toUtcDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 星期一 = 0 … 星期日 = 6 */
export function weekdayIndex(key: DayKey): number {
  return (toUtcDate(key).getUTCDay() + 6) % 7;
}

/** 該日所屬週的星期一 */
export function weekStartOf(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

/** 該週星期一到星期日的 7 天 */
export function daysOfWeek(weekStart: DayKey): DayKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** 兩個日期相差幾天（b - a） */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

export function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = toUtcDate(key);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}
