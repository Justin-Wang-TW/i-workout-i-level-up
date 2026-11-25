import { describe, expect, it } from 'vitest';
import {
  PLAN_DAYS,
  addDays,
  planProgress,
  rollExpedition,
  EXPEDITIONS,
  scoreRootQuiz,
  seededRng,
  skillLevel,
  sanitizeEstimate,
  macroShare,
  scaleNutrients,
} from '../../packages/game-core/index.ts';
import {
  addFood,
  buyGear,
  buySeed,
  claimMilestone,
  claimableMilestones,
  collectExpedition,
  craftPill,
  drawDailyLot,
  harvestPlot,
  pathProgress,
  plantSeed,
  setHardMode,
  settlePath,
  shouldCelebrate,
  startExpedition,
  startPath,
  takePill,
  writeJournal,
} from './cultivation.ts';
import { addCup, claimDaily, completeBodyweight, createPlayer, totalXp } from './game.ts';
import { getInv } from './inventory.ts';
import type { SaveData } from './types.ts';

const BASE: SaveData = { version: 1, player: null, days: {}, ledger: [], lastSeenLevel: 1 };
const D0 = '2026-11-02';

function newSave(): SaveData {
  return createPlayer(BASE, {
    name: '測試',
    avatar: 'sword',
    createdAt: '2026-11-01T00:00:00Z',
    weightKg: null,
    waterGoalMl: 1000,
    cupMl: 500,
    difficulty: 'beginner',
    timeZone: 'Asia/Taipei',
    safetyAcknowledged: true,
  });
}

/** 讓某一天「圓滿」：喝水達標 + 淬體 */
function completeDay(s: SaveData, day: string): SaveData {
  let x = addCup(s, day, 500);
  x = addCup(x, day, 500);
  return completeBodyweight(x, day);
}

describe('六十六日築基', () => {
  it('每圓滿一天前進一日，缺席不前進', () => {
    const states: Record<string, 'done' | 'rest' | 'none'> = {
      [D0]: 'done',
      [addDays(D0, 1)]: 'none',
      [addDays(D0, 2)]: 'rest',
    };
    const p = planProgress(D0, addDays(D0, 3), (d) => states[d] ?? 'none');
    expect(p.completed).toBe(2);
    expect(p.dayNo).toBe(3);
    expect(p.firstMiss).toBe(addDays(D0, 1));
    expect(p.todayDone).toBe(false);
  });

  it('滿 66 天就結束', () => {
    const p = planProgress(D0, addDays(D0, 80), () => 'done');
    expect(p.completed).toBe(PLAN_DAYS);
    expect(p.finished).toBe(true);
  });

  it('里程碑可領一次，逆天模式獎勵 ×1.5', () => {
    let s = startPath(newSave(), D0);
    for (let i = 0; i < 7; i++) s = completeDay(s, addDays(D0, i));
    const today = addDays(D0, 6);
    expect(claimableMilestones(s, today).map((m) => m.day)).toEqual([7]);
    const r = claimMilestone(s, today, 7);
    expect(r.xp).toBe(50);
    expect(claimableMilestones(r.save, today)).toHaveLength(0);
    const hard = claimMilestone(setHardMode(s, true, D0), today, 7);
    expect(hard.xp).toBe(75);
  });

  it('逆天模式缺席：重頭並扣兩成靈石（只扣一次）', () => {
    let s = startPath(newSave(), D0, true);
    s = completeDay(s, D0);
    s = { ...s, inv: { ...getInv(s), stones: 100 } };
    // D0+1、D0+2 都缺席，今天 D0+3
    const after = settlePath(s, addDays(D0, 3));
    expect(getInv(after).stones).toBe(80);
    expect(after.path!.start).toBe(addDays(D0, 3));
    expect(after.path!.notice?.includes('道基崩毀')).toBe(true);
    expect(pathProgress(after, addDays(D0, 3))!.completed).toBe(0);
  });

  it('逆天模式有洗髓丹時自動護道', () => {
    let s = startPath(newSave(), D0, true);
    s = completeDay(s, D0);
    s = completeDay(s, addDays(D0, 2));
    s = { ...s, inv: { ...getInv(s), stones: 100, pills: { marrow_pill: 1 } } };
    const after = settlePath(s, addDays(D0, 2));
    expect(getInv(after).stones).toBe(100);
    expect(getInv(after).pills.marrow_pill).toBeUndefined();
    expect(pathProgress(after, addDays(D0, 2))!.completed).toBe(3);
  });

  it('開啟逆天模式前的缺席不追究', () => {
    let s = startPath(newSave(), D0);
    s = completeDay(s, D0);
    const today = addDays(D0, 3);
    s = setHardMode(s, true, today);
    const after = settlePath(s, today);
    expect(after.path!.start).toBe(D0);
  });

  it('一般模式缺席不會重頭', () => {
    const s = startPath(completeDay(newSave(), D0), D0);
    expect(settlePath(s, addDays(D0, 5))).toBe(s);
  });

  it('當天圓滿時觸發慶祝', () => {
    const s = newSave();
    expect(shouldCelebrate(s, D0)).toBe(false);
    expect(shouldCelebrate(completeDay(s, D0), D0)).toBe(true);
  });
});

describe('靈石、精力與歷練', () => {
  it('領取功課得到靈石與精力', () => {
    let s = completeDay(newSave(), D0);
    s = claimDaily(s, D0, 'bodyweight').save;
    expect(getInv(s).stones).toBe(4);
    expect(getInv(s).stamina).toBe(4);
  });

  it('出發時扣精力，時間到才領得到戰利品', () => {
    const now = new Date('2026-11-02T10:00:00Z');
    const r = startExpedition(newSave(), 'stone_hill', now, seededRng(1));
    expect(r.error).toBeUndefined();
    expect(getInv(r.save).stamina).toBe(2);
    expect(collectExpedition(r.save, new Date('2026-11-02T10:30:00Z')).story).toBeUndefined();
    const done = collectExpedition(r.save, new Date('2026-11-02T11:00:01Z'));
    expect(getInv(done.save).stones).toBeGreaterThan(3);
    expect(getInv(done.save).expedition).toBe(null);
  });

  it('境界或精力不足不能出發', () => {
    expect(startExpedition(newSave(), 'demon_forest').error).toBe('境界不足');
    const tired = { ...newSave(), inv: { ...getInv(newSave()), stamina: 0 } };
    expect(startExpedition(tired, 'stone_hill').error).toBe('精力不足');
  });

  it('戰利品由種子決定、可重現', () => {
    const def = EXPEDITIONS[1];
    const a = rollExpedition(def, { stonesPct: 0, speedPct: 0, extraHerbs: 0 }, seededRng(42));
    const b = rollExpedition(def, { stonesPct: 0, speedPct: 0, extraHerbs: 0 }, seededRng(42));
    expect(a).toEqual(b);
    expect(a.stones >= def.stones[0] && a.stones <= def.stones[1]).toBe(true);
  });
});

describe('法寶、靈田與煉丹', () => {
  it('靈石不足不能買；買到自動裝備', () => {
    expect(buyGear(newSave(), 'jade_pin').error).toBe('靈石不足');
    const rich = { ...newSave(), inv: { ...getInv(newSave()), stones: 100 } };
    const r = buyGear(rich, 'jade_pin');
    expect(getInv(r.save).stones).toBe(40);
    expect(getInv(r.save).equipped.head).toBe('jade_pin');
    expect(buyGear(rich, 'gold_crown').error).toBe('境界不足');
  });

  it('種植、等待、收成', () => {
    const t0 = new Date('2026-11-02T00:00:00Z');
    let s = plantSeed(newSave(), 0, 'calm_grass', t0).save;
    expect(getInv(s).seeds.calm_grass).toBe(1);
    expect(harvestPlot(s, 0, new Date('2026-11-02T01:00:00Z')).amount).toBe(0);
    const h = harvestPlot(s, 0, new Date('2026-11-02T02:00:01Z'), () => 0.99);
    expect(h.amount).toBe(2);
    s = h.save;
    expect(getInv(s).herbs.calm_grass).toBe(2);
    expect(getInv(s).plots[0]).toBe(null);
    expect(buySeed(s, 'ice_lotus').error).toBe('靈石不足');
  });

  it('煉丹成功得丹藥；一天只能服一顆', () => {
    let s = { ...newSave(), inv: { ...getInv(newSave()), herbs: { calm_grass: 6, sun_flower: 1 } } };
    s = craftPill(s, 'gather_pill', () => 0).save;
    expect(getInv(s).pills.gather_pill).toBe(1);
    const fail = craftPill(s, 'qi_pill', () => 0.999);
    expect(fail.ok).toBe(false);
    expect(getInv(fail.save).herbs.calm_grass).toBe(1);
    const before = totalXp(s);
    const t = takePill(s, D0, 'gather_pill');
    expect(totalXp(t.save) - before).toBe(30);
    s = { ...t.save, inv: { ...getInv(t.save), pills: { gather_pill: 1 } } };
    expect(takePill(s, D0, 'gather_pill').error?.includes('今日已服')).toBe(true);
  });
});

describe('道心籤、日誌與餐點', () => {
  it('每天只能抽一次籤', () => {
    const s = drawDailyLot(newSave(), D0, seededRng(3));
    const stones = getInv(s).stones;
    expect(stones).toBeGreaterThan(0);
    expect(drawDailyLot(s, D0)).toBe(s);
  });

  it('日誌第一次寫給靈石，修改不重複給', () => {
    let s = writeJournal(newSave(), D0, 4, '今天走了一萬步');
    expect(getInv(s).stones).toBe(2);
    s = writeJournal(s, D0, 5, '改一下');
    expect(getInv(s).stones).toBe(2);
    expect(s.days[D0].journal?.mood).toBe(5);
  });

  it('餐點紀錄每天最多 3 筆給靈石', () => {
    let s = newSave();
    const est = { name: '便當', items: [], kcal: 700, carbsG: 90, proteinG: 30, fatG: 22, vitamins: '', minerals: '', note: '' };
    for (let i = 0; i < 5; i++) s = addFood(s, D0, 'lunch', est, 'manual');
    expect(s.food).toHaveLength(5);
    expect(getInv(s).stones).toBe(3);
  });

  it('AI 回傳值會被整理成安全範圍', () => {
    const e = sanitizeEstimate({ kcal: '650 kcal', carbs_g: 80, proteinG: -3, fatG: 99999, items: [{ name: '雞腿', portion: '1 支' }] });
    expect(e.kcal).toBe(650);
    expect(e.carbsG).toBe(80);
    expect(e.proteinG).toBe(0);
    expect(e.fatG).toBe(400);
    expect(e.name).toBe('雞腿');
  });

  it('三大營養素熱量比例與份數換算', () => {
    expect(macroShare({ kcal: 0, carbsG: 50, proteinG: 25, fatG: 0 })).toEqual({ carbs: 67, protein: 33, fat: 0 });
    expect(scaleNutrients({ kcal: 200, carbsG: 30, proteinG: 5, fatG: 7 }, 1.5).kcal).toBe(300);
  });
});

describe('測靈根與功法', () => {
  it('依答案判定靈根與難度', () => {
    expect(scoreRootQuiz([0, 0, 2, 0, 3]).root).toBe('water');
    expect(scoreRootQuiz([3, 2, 2, 1, 2]).difficulty).toBe('advanced');
    expect(scoreRootQuiz([1, 1, 0, 2, 3]).root).toBe('earth');
  });

  it('功法等級門檻 5、15、30…', () => {
    expect(skillLevel(4).level).toBe(0);
    expect(skillLevel(5).level).toBe(1);
    expect(skillLevel(15).level).toBe(2);
    expect(skillLevel(9999).level).toBe(9);
  });
});

describe('舊存檔升級', () => {
  it('依過去領過的功課補發靈石', async () => {
    const { parseImport } = await import('./game.ts');
    const old = { ...newSave(), inv: undefined, ledger: [{ id: 'a', day: D0, kind: 'daily' as const, ref: 'x', reason: '', amount: 40, multiplier: 1, attribute: null, at: '' }] };
    const migrated = parseImport(JSON.stringify(old))!;
    expect(getInv(migrated).stones).toBe(4);
  });
});
