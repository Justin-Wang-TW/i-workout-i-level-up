// v0.7 修行系統的存檔操作：全部是純函式，回傳新的 SaveData。
import {
  ALCHEMY_BASE_RATE,
  EXPEDITIONS,
  GEAR,
  HARD_MODE_REWARD,
  HARD_MODE_STONE_LOSS,
  JOURNAL_STONES,
  PILLS,
  PILLS_PER_DAY,
  PLAN_MILESTONES,
  SKILLS,
  STAMINA_MAX,
  addDays,
  dayCountsForStreak,
  drawLot,
  expeditionDurationMs,
  gearById,
  herbById,
  levelInfo,
  planProgress,
  plotCount,
  realmIndex,
  rollExpedition,
  seededRng,
  skillLevel,
  type DayKey,
  type ExpeditionBonus,
  type GearSlot,
  type HerbId,
  type NutritionEstimate,
  type PillId,
  type RealmId,
  type RootId,
  type SkillId,
  type MealSlot,
} from '../../packages/game-core/index.ts';
import { GAME_CONFIG } from '../../packages/game-core/index.ts';
import { getDayLog, newId, toActivity, totalXp } from './game.ts';
import { addCount, addLog, getInv, withInv } from './inventory.ts';
import type { FoodEntry, Inventory, LedgerEntry, PathState, SaveData } from './types.ts';

const REALM_ORDER: RealmId[] = ['qi', 'foundation', 'core', 'nascent', 'spirit', 'tribulation', 'ascension'];

export function playerRealmIndex(save: SaveData): number {
  return realmIndex(levelInfo(totalXp(save)).level);
}

export function meetsRealm(save: SaveData, realm: RealmId): boolean {
  return playerRealmIndex(save) >= REALM_ORDER.indexOf(realm);
}

function bonusEntry(day: DayKey, ref: string, reason: string, amount: number, now: Date): LedgerEntry {
  return { id: newId(), day, kind: 'bonus', ref, reason, amount, multiplier: 1, attribute: null, at: now.toISOString() };
}

function withDayLog(save: SaveData, day: DayKey, patch: (l: ReturnType<typeof getDayLog>) => ReturnType<typeof getDayLog>): SaveData {
  return { ...save, days: { ...save.days, [day]: patch(getDayLog(save, day)) } };
}

// ───────── 測靈根 ─────────

export function applyRootResult(save: SaveData, root: RootId, difficulty: 'beginner' | 'intermediate' | 'advanced'): SaveData {
  if (!save.player) return save;
  return { ...save, player: { ...save.player, root, difficulty } };
}

// ───────── 六十六日築基 ─────────

export function startPath(save: SaveData, today: DayKey, hard = false): SaveData {
  const prev = save.path;
  const path: PathState = {
    start: today,
    round: (prev?.round ?? 0) + 1,
    hard,
    hardSince: hard ? today : undefined,
    claimed: [],
    forgiven: [],
    finishedRounds: prev?.finishedRounds ?? 0,
  };
  return { ...save, path };
}

function dayStateFor(save: SaveData) {
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  const forgiven = new Set(save.path?.forgiven ?? []);
  return (day: DayKey): 'done' | 'rest' | 'none' => {
    const log = save.days[day];
    if (forgiven.has(day)) return 'rest';
    if (!log) return 'none';
    if (log.restTicketUsed) return 'rest';
    return dayCountsForStreak(toActivity(save, day), goal) ? 'done' : 'none';
  };
}

export function pathProgress(save: SaveData, today: DayKey) {
  if (!save.path) return null;
  return planProgress(save.path.start, today, dayStateFor(save));
}

/**
 * 逆天模式結算：有缺席日時，先用洗髓丹護道；沒有丹藥就重頭築基並損失靈石。
 * 一般模式不做任何事。
 */
export function settlePath(save: SaveData, today: DayKey): SaveData {
  const path = save.path;
  if (!path || !path.hard) return save;
  let next = save;
  let charged = false;
  // 一次可能缺好幾天，逐日處理；靈石只扣一次
  for (let guard = 0; guard < 400; guard++) {
    const p = pathProgress(next, today);
    const since = next.path!.hardSince ?? next.path!.start;
    const miss = p?.days.find((d) => d.state === 'miss' && d.day >= since)?.day;
    if (!p || !miss || p.finished) return next;
    const inv = getInv(next);
    const cur = next.path!;
    if ((inv.pills.marrow_pill ?? 0) > 0) {
      next = {
        ...withInv(next, (i) => addLog({ ...i, pills: addCount(i.pills, 'marrow_pill', -1) }, `洗髓丹護道：${miss} 的缺席不計。`)),
        path: { ...cur, forgiven: [...cur.forgiven, miss], notice: `洗髓丹護住了道基（${miss} 缺席不計）。` },
      };
      continue;
    }
    const lost = charged ? 0 : Math.floor(inv.stones * HARD_MODE_STONE_LOSS);
    const restart = addDays(miss, 1) > today ? today : addDays(miss, 1);
    next = {
      ...(charged
        ? next
        : withInv(next, (i) => addLog({ ...i, stones: i.stones - lost }, `逆天模式：${miss} 缺席，道基崩毀，損失靈石 ${lost}。`))),
      path: {
        ...cur,
        start: restart,
        hardSince: restart,
        claimed: [],
        forgiven: [],
        notice: charged ? cur.notice : `逆天模式：${miss} 未完成功課，道基崩毀，重頭築基（損失靈石 ${lost}）。`,
      },
    };
    charged = true;
  }
  return next;
}

export function clearPathNotice(save: SaveData): SaveData {
  if (!save.path?.notice) return save;
  const { notice: _n, ...rest } = save.path;
  return { ...save, path: rest };
}

/** 開啟逆天模式時記下起算日：開啟前的缺席不追究 */
export function setHardMode(save: SaveData, hard: boolean, today: DayKey): SaveData {
  if (!save.path) return save;
  return { ...save, path: { ...save.path, hard, hardSince: hard ? today : undefined } };
}

export function claimableMilestones(save: SaveData, today: DayKey) {
  const p = pathProgress(save, today);
  if (!p || !save.path) return [];
  return PLAN_MILESTONES.filter((m) => p.completed >= m.day && !save.path!.claimed.includes(m.day));
}

export function claimMilestone(save: SaveData, today: DayKey, day: number, now = new Date()): { save: SaveData; xp: number; stones: number } {
  const m = claimableMilestones(save, today).find((x) => x.day === day);
  if (!m || !save.path) return { save, xp: 0, stones: 0 };
  const k = save.path.hard ? HARD_MODE_REWARD : 1;
  const xp = Math.round(m.xp * k);
  const stones = Math.round(m.stones * k);
  const ref = `plan:${save.path.round}:${save.path.start}:${m.day}`;
  let next: SaveData = {
    ...save,
    ledger: [...save.ledger, bonusEntry(today, ref, `築基・${m.name}`, xp, now)],
    path: {
      ...save.path,
      claimed: [...save.path.claimed, m.day],
      finishedRounds: save.path.finishedRounds + (m.day === 66 ? 1 : 0),
    },
  };
  next = withInv(next, (i) => ({ ...i, stones: i.stones + stones }));
  return { save: next, xp, stones };
}

// ───────── 本命丹火（連修） ─────────

export function flameTier(streak: number): { name: string; color: string; size: number } {
  if (streak >= 66) return { name: '三昧真火', color: '#ffffff', size: 5 };
  if (streak >= 30) return { name: '紫極靈焰', color: '#b28dff', size: 4 };
  if (streak >= 7) return { name: '金烏真焰', color: '#f2c94c', size: 3 };
  if (streak >= 3) return { name: '青蓮靈火', color: '#5fd4b0', size: 2 };
  if (streak >= 1) return { name: '星星之火', color: '#f2785c', size: 1 };
  return { name: '丹火未燃', color: '#6b6f86', size: 0 };
}

export function markCelebrated(save: SaveData, day: DayKey): SaveData {
  return withDayLog(save, day, (l) => ({ ...l, celebrated: true }));
}

/** 今天剛好圓滿（可推進築基）而且還沒慶祝過 */
export function shouldCelebrate(save: SaveData, day: DayKey): boolean {
  const log = save.days[day];
  if (!log || log.celebrated || log.restTicketUsed) return false;
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  return dayCountsForStreak(toActivity(save, day), goal);
}

// ───────── 道心籤與修行日誌 ─────────

export function drawDailyLot(save: SaveData, day: DayKey, rng: () => number = Math.random): SaveData {
  if (getDayLog(save, day).lot) return save;
  const lot = drawLot(rng);
  const next = withDayLog(save, day, (l) => ({ ...l, lot: { category: lot.category, index: lot.index, rank: lot.rank } }));
  return withInv(next, (i) => ({ ...i, stones: i.stones + lot.stones }));
}

export function writeJournal(save: SaveData, day: DayKey, mood: number, text: string, now = new Date()): SaveData {
  const first = !getDayLog(save, day).journal;
  const entry = { mood: Math.max(1, Math.min(5, Math.round(mood))), text: text.trim().slice(0, 200), at: now.toISOString() };
  const next = withDayLog(save, day, (l) => ({ ...l, journal: entry }));
  return first ? withInv(next, (i) => ({ ...i, stones: i.stones + JOURNAL_STONES })) : next;
}

// ───────── 功法 ─────────

export function skillPoints(save: SaveData): Record<SkillId, number> {
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  const pts: Record<SkillId, number> = { spring: 0, wind: 0, diamond: 0, nourish: 0, calm: 0 };
  const foodByDay = new Map<string, number>();
  for (const f of save.food ?? []) foodByDay.set(f.day, (foodByDay.get(f.day) ?? 0) + 1);
  for (const [day, log] of Object.entries(save.days)) {
    const water = log.cups.reduce((s, c) => s + c.ml, 0);
    if (water >= goal) pts.spring += 3;
    const km = log.workouts.filter((w) => w.type !== 'other').reduce((s, w) => s + w.distanceKm, 0);
    pts.wind += Math.min(6, Math.floor(log.steps / 2000)) + Math.min(6, Math.floor(km));
    if (log.bodyweightDone) pts.diamond += 4;
    pts.nourish += Object.keys(log.meals ?? {}).length + Math.min(3, foodByDay.get(day) ?? 0);
    if (log.journal) pts.calm += 2;
    if (log.lot) pts.calm += 1;
  }
  return pts;
}

export function skillLevels(save: SaveData): Record<SkillId, number> {
  const pts = skillPoints(save);
  const out = {} as Record<SkillId, number>;
  for (const s of SKILLS) out[s.id] = skillLevel(pts[s.id]).level;
  return out;
}

// ───────── 法寶 ─────────

function gearBonus(inv: Inventory, effect: string): number {
  return Object.values(inv.equipped)
    .map((id) => gearById(id))
    .filter((g) => g && g.effect === effect)
    .reduce((s, g) => s + (g?.value ?? 0), 0);
}

export function buyGear(save: SaveData, id: string): { save: SaveData; error?: string } {
  const g = gearById(id);
  const inv = getInv(save);
  if (!g) return { save, error: '查無此法寶' };
  if (inv.gear.includes(id)) return { save, error: '已擁有' };
  if (!meetsRealm(save, g.realm)) return { save, error: '境界不足' };
  if (inv.stones < g.price) return { save, error: '靈石不足' };
  const next = withInv(save, (i) =>
    addLog({ ...i, stones: i.stones - g.price, gear: [...i.gear, id], equipped: { ...i.equipped, [g.slot]: id } }, `購得法寶「${g.name}」。`),
  );
  return { save: next };
}

export function equipGear(save: SaveData, slot: GearSlot, id: string | null): SaveData {
  const inv = getInv(save);
  if (id && (!inv.gear.includes(id) || gearById(id)?.slot !== slot)) return save;
  return withInv(save, (i) => {
    const equipped = { ...i.equipped };
    if (id) equipped[slot] = id;
    else delete equipped[slot];
    return { ...i, equipped };
  });
}

export function equippedGear(save: SaveData): Partial<Record<GearSlot, string>> {
  return getInv(save).equipped;
}

// ───────── 出門歷練 ─────────

export function expeditionBonus(save: SaveData): ExpeditionBonus {
  const inv = getInv(save);
  const lv = skillLevels(save);
  return {
    stonesPct: gearBonus(inv, 'stones') + 3 * (lv.spring + lv.diamond),
    speedPct: gearBonus(inv, 'speed') + 2 * lv.wind,
    extraHerbs: gearBonus(inv, 'loot'),
  };
}

export function startExpedition(save: SaveData, id: string, now = new Date(), rng?: () => number): { save: SaveData; error?: string } {
  const def = EXPEDITIONS.find((e) => e.id === id);
  const inv = getInv(save);
  if (!def) return { save, error: '查無此地' };
  if (inv.expedition) return { save, error: '已在歷練途中' };
  if (!meetsRealm(save, def.realm)) return { save, error: '境界不足' };
  if (inv.stamina < def.stamina) return { save, error: '精力不足' };
  const bonus = expeditionBonus(save);
  const loot = rollExpedition(def, bonus, rng ?? seededRng(now.getTime()));
  const end = new Date(now.getTime() + expeditionDurationMs(def, bonus.speedPct));
  const next = withInv(save, (i) => ({
    ...i,
    stamina: i.stamina - def.stamina,
    expedition: { id, start: now.toISOString(), end: end.toISOString(), loot },
  }));
  return { save: next };
}

export function collectExpedition(save: SaveData, now = new Date()): { save: SaveData; story?: string } {
  const inv = getInv(save);
  const ex = inv.expedition;
  if (!ex || Date.parse(ex.end) > now.getTime()) return { save };
  let herbs = inv.herbs;
  for (const [h, n] of Object.entries(ex.loot.herbs)) herbs = addCount(herbs, h as HerbId, n ?? 0);
  let seeds = inv.seeds;
  for (const [h, n] of Object.entries(ex.loot.seeds)) seeds = addCount(seeds, h as HerbId, n ?? 0);
  const names = [
    ...Object.entries(ex.loot.herbs).map(([h, n]) => `${herbById(h as HerbId).name}×${n}`),
    ...Object.entries(ex.loot.seeds).map(([h, n]) => `${herbById(h as HerbId).name}種子×${n}`),
  ];
  const story = `${ex.loot.story}${names.length ? `另得${names.join('、')}。` : ''}`;
  const next = withInv(save, (i) => addLog({ ...i, stones: i.stones + ex.loot.stones, herbs, seeds, expedition: null }, story, now));
  return { save: next, story };
}

// ───────── 靈田 ─────────

export function syncPlots(save: SaveData): SaveData {
  const inv = getInv(save);
  const n = plotCount(playerRealmIndex(save));
  if (inv.plots.length >= n) return save;
  return withInv(save, (i) => ({ ...i, plots: [...i.plots, ...Array(n - i.plots.length).fill(null)] }));
}

export function buySeed(save: SaveData, herb: HerbId): { save: SaveData; error?: string } {
  const h = herbById(herb);
  const inv = getInv(save);
  if (inv.stones < h.seedPrice) return { save, error: '靈石不足' };
  return { save: withInv(save, (i) => ({ ...i, stones: i.stones - h.seedPrice, seeds: addCount(i.seeds, herb, 1) })) };
}

export function plantSeed(save: SaveData, plot: number, herb: HerbId, now = new Date()): { save: SaveData; error?: string } {
  const inv = getInv(syncPlots(save));
  if (plot < 0 || plot >= inv.plots.length) return { save, error: '沒有這塊靈田' };
  if (inv.plots[plot]) return { save, error: '這塊靈田已有作物' };
  if ((inv.seeds[herb] ?? 0) <= 0) return { save, error: '沒有種子' };
  const plots = [...inv.plots];
  plots[plot] = { herb, plantedAt: now.toISOString() };
  return { save: withInv(syncPlots(save), (i) => ({ ...i, plots, seeds: addCount(i.seeds, herb, -1) })) };
}

export function plotReadyAt(p: { herb: HerbId; plantedAt: string }): number {
  return Date.parse(p.plantedAt) + herbById(p.herb).growHours * 3_600_000;
}

export function harvestPlot(save: SaveData, plot: number, now = new Date(), rng: () => number = Math.random): { save: SaveData; amount: number } {
  const inv = getInv(save);
  const p = inv.plots[plot];
  if (!p || plotReadyAt(p) > now.getTime()) return { save, amount: 0 };
  const lv = skillLevels(save);
  const bonus = gearBonus(inv, 'harvest') + (rng() < lv.nourish * 0.05 ? 1 : 0);
  const amount = herbById(p.herb).yield + bonus;
  const plots = [...inv.plots];
  plots[plot] = null;
  return { save: withInv(save, (i) => ({ ...i, plots, herbs: addCount(i.herbs, p.herb, amount) })), amount };
}

// ───────── 煉丹與服丹 ─────────

export function alchemyRate(save: SaveData): number {
  const inv = getInv(save);
  return Math.min(98, ALCHEMY_BASE_RATE + gearBonus(inv, 'alchemy') + 2 * skillLevels(save).calm);
}

export function canCraft(save: SaveData, pill: PillId): boolean {
  const inv = getInv(save);
  const def = PILLS.find((p) => p.id === pill);
  if (!def) return false;
  return Object.entries(def.recipe).every(([h, n]) => (inv.herbs[h as HerbId] ?? 0) >= (n ?? 0));
}

export function craftPill(save: SaveData, pill: PillId, rng: () => number = Math.random, now = new Date()): { save: SaveData; ok: boolean } {
  const def = PILLS.find((p) => p.id === pill);
  if (!def || !canCraft(save, pill)) return { save, ok: false };
  const ok = rng() * 100 < alchemyRate(save);
  const next = withInv(save, (i) => {
    let herbs = i.herbs;
    for (const [h, n] of Object.entries(def.recipe)) herbs = addCount(herbs, h as HerbId, -(n ?? 0));
    const pills = ok ? addCount(i.pills, pill, 1) : i.pills;
    return addLog({ ...i, herbs, pills }, ok ? `開爐煉成「${def.name}」一枚。` : `煉製「${def.name}」失敗，靈草化為飛灰。`, now);
  });
  return { save: next, ok };
}

export function pillsTakenToday(save: SaveData, day: DayKey): number {
  return getDayLog(save, day).pillTaken ? 1 : 0;
}

export function takePill(save: SaveData, day: DayKey, pill: PillId, now = new Date()): { save: SaveData; error?: string; xp: number } {
  const def = PILLS.find((p) => p.id === pill);
  const inv = getInv(save);
  if (!def) return { save, error: '查無此丹', xp: 0 };
  if (pill === 'marrow_pill') return { save, error: '洗髓丹會在逆天模式缺席時自動護道', xp: 0 };
  if ((inv.pills[pill] ?? 0) <= 0) return { save, error: '沒有這種丹藥', xp: 0 };
  if (pillsTakenToday(save, day) >= PILLS_PER_DAY) return { save, error: '今日已服過丹藥，過猶不及', xp: 0 };
  if (def.stamina > 0 && inv.stamina >= STAMINA_MAX) return { save, error: '精力已滿', xp: 0 };
  let next = withInv(save, (i) => ({
    ...i,
    pills: addCount(i.pills, pill, -1),
    stamina: Math.min(STAMINA_MAX, i.stamina + def.stamina),
  }));
  next = withDayLog(next, day, (l) => ({ ...l, pillTaken: pill }));
  if (def.xp > 0) next = { ...next, ledger: [...next.ledger, bonusEntry(day, `pill:${newId()}`, `服用${def.name}`, def.xp, now)] };
  return { save: next, xp: def.xp };
}

// ───────── 餐點紀錄 ─────────

const MAX_FOOD = 200;
const MAX_THUMBS = 40;
export const FOOD_STONES_PER_DAY = 3;

export function addFood(
  save: SaveData,
  day: DayKey,
  slot: MealSlot,
  est: Pick<NutritionEstimate, 'name' | 'items' | 'kcal' | 'carbsG' | 'proteinG' | 'fatG' | 'vitamins' | 'minerals' | 'note'>,
  source: FoodEntry['source'],
  thumb?: string,
  now = new Date(),
): SaveData {
  const entry: FoodEntry = { id: newId(), day, slot, at: now.toISOString(), ...est, source, thumb };
  const before = (save.food ?? []).filter((f) => f.day === day).length;
  let food = [...(save.food ?? []), entry].slice(-MAX_FOOD);
  // 只保留最近幾筆的縮圖，避免手機儲存空間爆掉
  const withThumb = food.filter((f) => f.thumb).length;
  if (withThumb > MAX_THUMBS) {
    let drop = withThumb - MAX_THUMBS;
    food = food.map((f) => {
      if (drop > 0 && f.thumb) {
        drop -= 1;
        const { thumb: _t, ...rest } = f;
        return rest;
      }
      return f;
    });
  }
  const next = { ...save, food };
  return before < FOOD_STONES_PER_DAY ? withInv(next, (i) => ({ ...i, stones: i.stones + 1 })) : next;
}

export function removeFood(save: SaveData, id: string): SaveData {
  return { ...save, food: (save.food ?? []).filter((f) => f.id !== id) };
}

export function foodOn(save: SaveData, day: DayKey): FoodEntry[] {
  return (save.food ?? []).filter((f) => f.day === day);
}

export { GEAR };
