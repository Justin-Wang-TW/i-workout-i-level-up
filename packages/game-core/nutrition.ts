// 餐點紀錄：熱量與五大營養素（醣類、蛋白質、脂質以公克估算；維生素、礦物質列出主要來源）。
import type { MealId } from './config.ts';

export type MealSlot = MealId | 'snack';

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '早膳',
  lunch: '午膳',
  dinner: '晚膳',
  snack: '點心',
};

export interface Nutrients {
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export interface NutritionEstimate extends Nutrients {
  /** 餐點名稱，例如「雞腿便當」 */
  name: string;
  /** 辨識出的食物與份量 */
  items: { name: string; portion: string }[];
  /** 維生素主要來源（文字） */
  vitamins: string;
  /** 礦物質主要來源（文字） */
  minerals: string;
  /** 補充說明，例如「醬汁份量不確定」 */
  note: string;
  /** 0–1：AI 對估算的信心 */
  confidence: number;
}

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0 };

function num(v: unknown, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n * 10) / 10);
}

function text(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** 把 AI 回傳的 JSON 整理成安全的數值（防止亂碼或極端值） */
export function sanitizeEstimate(raw: unknown): NutritionEstimate {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(r.items)
    ? r.items
        .slice(0, 12)
        .map((x) => {
          const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
          return { name: text(o.name, 40), portion: text(o.portion, 40) };
        })
        .filter((x) => x.name)
    : [];
  const conf = typeof r.confidence === 'number' ? r.confidence : 0.5;
  return {
    name: text(r.name, 40) || items.map((i) => i.name).slice(0, 3).join('、') || '餐點',
    items,
    kcal: num(r.kcal, 5000),
    carbsG: num(r.carbsG ?? r.carbs_g, 800),
    proteinG: num(r.proteinG ?? r.protein_g, 400),
    fatG: num(r.fatG ?? r.fat_g, 400),
    vitamins: text(r.vitamins),
    minerals: text(r.minerals),
    note: text(r.note, 200),
    confidence: Math.max(0, Math.min(1, conf)),
  };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce(
    (s, n) => ({
      kcal: s.kcal + n.kcal,
      carbsG: Math.round((s.carbsG + n.carbsG) * 10) / 10,
      proteinG: Math.round((s.proteinG + n.proteinG) * 10) / 10,
      fatG: Math.round((s.fatG + n.fatG) * 10) / 10,
    }),
    { ...EMPTY_NUTRIENTS },
  );
}

/** 三大營養素佔熱量的比例（醣類、蛋白質 4 kcal/g，脂質 9 kcal/g） */
export function macroShare(n: Nutrients): { carbs: number; protein: number; fat: number } {
  const c = n.carbsG * 4;
  const p = n.proteinG * 4;
  const f = n.fatG * 9;
  const total = c + p + f;
  if (total <= 0) return { carbs: 0, protein: 0, fat: 0 };
  return {
    carbs: Math.round((c / total) * 100),
    protein: Math.round((p / total) * 100),
    fat: Math.round((f / total) * 100),
  };
}

/** 營養標示 × 份數 */
export function scaleNutrients(n: Nutrients, servings: number): Nutrients {
  const k = Math.max(0, Math.min(20, servings));
  return {
    kcal: Math.round(n.kcal * k),
    carbsG: Math.round(n.carbsG * k * 10) / 10,
    proteinG: Math.round(n.proteinG * k * 10) / 10,
    fatG: Math.round(n.fatG * k * 10) / 10,
  };
}
