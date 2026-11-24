// 按時用膳（三餐時段打卡）
import { GAME_CONFIG, type MealDef, type MealId } from './config.ts';
import { DEFAULT_TIMEZONE } from './dates.ts';

/** 某時間點在指定時區的 'HH:MM' */
export function localTimeHHMM(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

export function mealDef(id: MealId): MealDef {
  return GAME_CONFIG.meals.find((m) => m.id === id)!;
}

export type MealWindowState = 'before' | 'open' | 'after';

export function mealWindowState(id: MealId, date: Date, timeZone?: string): MealWindowState {
  const def = mealDef(id);
  const now = localTimeHHMM(date, timeZone);
  if (now < def.start) return 'before';
  if (now < def.end) return 'open';
  return 'after';
}

/** 目前開放打卡的餐（沒有則為 null） */
export function openMeal(date: Date, timeZone?: string): MealDef | null {
  return GAME_CONFIG.meals.find((m) => mealWindowState(m.id, date, timeZone) === 'open') ?? null;
}

/** 距離時段結束還有幾分鐘（僅在開放時有意義） */
export function minutesLeft(id: MealId, date: Date, timeZone?: string): number {
  const [eh, em] = mealDef(id).end.split(':').map(Number);
  const [nh, nm] = localTimeHHMM(date, timeZone).split(':').map(Number);
  return eh * 60 + em - (nh * 60 + nm);
}
