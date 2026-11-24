// 連續天數、XP 加成與每日上限（需求書 2.5、3.2）
import { GAME_CONFIG } from './config.ts';
import { addDays, type DayKey } from './dates.ts';
import { dayCountsForStreak, type DayActivity } from './quests.ts';

/**
 * 目前連續天數。
 * 今天已達成 → 從今天往回數；今天還沒達成 → 從昨天往回數（連續紀錄仍然有效）。
 */
export function currentStreak(
  getDay: (key: DayKey) => DayActivity | undefined,
  today: DayKey,
  waterGoalMl: number,
  maxLookback = 400,
): number {
  let cursor = dayCountsForStreak(getDay(today), waterGoalMl) ? today : addDays(today, -1);
  let count = 0;
  while (count < maxLookback && dayCountsForStreak(getDay(cursor), waterGoalMl)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function streakMultiplier(streakDays: number): number {
  for (const b of GAME_CONFIG.streakBonus) {
    if (streakDays >= b.days) return b.multiplier;
  }
  return 1;
}

/** 套用連續加成後，若有設定每日上限再截斷 */
export function grantDailyXp(
  baseXp: number,
  streakDays: number,
  alreadyEarnedToday: number,
  cap: number | null = GAME_CONFIG.dailyXpCap,
): { granted: number; multiplier: number; capped: boolean } {
  const multiplier = streakMultiplier(streakDays);
  const wanted = Math.round(baseXp * multiplier);
  if (cap === null) return { granted: wanted, multiplier, capped: false };
  const room = Math.max(0, cap - alreadyEarnedToday);
  const granted = Math.min(wanted, room);
  return { granted, multiplier, capped: granted < wanted };
}

/** 依體重建議喝水目標（ml），四捨五入到 50 ml */
export function waterGoalFromWeight(kg: number | null | undefined): number {
  const w = GAME_CONFIG.water;
  if (!kg || !Number.isFinite(kg) || kg <= 0) return w.defaultGoalMl;
  const raw = Math.round((kg * w.mlPerKg) / 50) * 50;
  return Math.min(w.maxGoalMl, Math.max(w.minGoalMl, raw));
}
