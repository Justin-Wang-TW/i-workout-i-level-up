import { describe, expect, it } from 'vitest';
import { DAILY_LIMIT, extractJson, handleAnalyzeMeal, startOfTaipeiDay, type MealDeps } from './meal.ts';

const IMG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function deps(over: Partial<MealDeps> = {}): MealDeps & { recorded: number } {
  const d = {
    recorded: 0,
    hasKey: true,
    userId: async (a: string | null) => (a === 'Bearer ok' ? 'u1' : null),
    usedToday: async () => 0,
    record: async () => {
      d.recorded += 1;
    },
    vision: async () => '好的：{"name":"雞腿便當","kcal":780,"carbsG":95,"proteinG":38,"fatG":26,"confidence":0.7}',
    ...over,
  };
  return d;
}

const req = (body: unknown, auth = 'Bearer ok') =>
  new Request('http://x/analyze-meal', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body) });

describe('analyze-meal', () => {
  it('沒有 AI 金鑰時回傳 no_ai', async () => {
    const r = await handleAnalyzeMeal(req({ image: IMG }), deps({ hasKey: false }));
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe('no_ai');
  });

  it('未登入擋下', async () => {
    const r = await handleAnalyzeMeal(req({ image: IMG }, 'Bearer bad'), deps());
    expect(r.status).toBe(401);
  });

  it('成功時回傳估算並記錄次數', async () => {
    const d = deps();
    const r = await handleAnalyzeMeal(req({ image: IMG, mode: 'photo' }), d);
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.estimate.kcal).toBe(780);
    expect(d.recorded).toBe(1);
  });

  it('超過每日上限', async () => {
    const r = await handleAnalyzeMeal(req({ image: IMG }), deps({ usedToday: async () => DAILY_LIMIT }));
    expect(r.status).toBe(429);
  });

  it('不是食物', async () => {
    const r = await handleAnalyzeMeal(req({ image: IMG }), deps({ vision: async () => '{"error":"not_food"}' }));
    expect((await r.json()).code).toBe('bad_image');
  });

  it('非 base64 的圖片被擋下', async () => {
    const r = await handleAnalyzeMeal(req({ image: '<script>' }), deps());
    expect(r.status).toBe(400);
  });

  it('extractJson 與台灣時間換日', () => {
    expect(extractJson('xx {"a":1} yy')).toEqual({ a: 1 });
    expect(extractJson('沒有')).toBe(null);
    expect(startOfTaipeiDay(new Date('2026-11-25T03:00:00Z'))).toBe('2026-11-24T16:00:00.000Z');
  });
});
