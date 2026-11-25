// 遊戲狀態的純函式：所有修改都回傳新的 SaveData，方便測試與日後搬到雲端。
import {
  GAME_CONFIG,
  currentStreak,
  daysOfWeek,
  emptyDay,
  evaluateDailyQuests,
  evaluateWeeklyQuests,
  grantDailyXp,
  levelInfo,
  weekStartOf,
  type Attribute,
  dayKeyOf,
  mealWindowState,
  stonesForQuest,
  STAMINA_PER_CLAIM,
  type DailyQuestCode,
  type DayActivity,
  type MealId,
  type DayKey,
  type WeeklyQuestCode,
  type Workout,
} from '../../packages/game-core/index.ts';
import type { CloudDailyRow, CloudWorkoutRow } from '../cloud/cloud.ts';
import {
  emptyDayLog,
  type CloudState,
  type DayLog,
  type Track,
  type LedgerEntry,
  type Player,
  type SaveData,
} from './types.ts';
import { emptyInventory, grantQuestRewards, migrateInventory } from './inventory.ts';

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDayLog(save: SaveData, day: DayKey): DayLog {
  return save.days[day] ?? emptyDayLog();
}

export function toActivity(save: SaveData, day: DayKey): DayActivity {
  const log = save.days[day];
  if (!log) return emptyDay(day);
  return {
    day,
    waterMl: log.cups.reduce((s, c) => s + c.ml, 0),
    cups: log.cups.length,
    steps: log.steps,
    stepsSource: log.stepsSource,
    workouts: log.workouts,
    bodyweightDone: log.bodyweightDone,
    restTicketUsed: log.restTicketUsed,
    meals: log.meals ?? {},
  };
}

function withDay(save: SaveData, day: DayKey, patch: (log: DayLog) => DayLog): SaveData {
  return { ...save, days: { ...save.days, [day]: patch(getDayLog(save, day)) } };
}

export function totalXp(save: SaveData): number {
  return save.ledger.reduce((s, e) => s + e.amount, 0);
}

export function xpEarnedOn(save: SaveData, day: DayKey): number {
  return save.ledger
    .filter((e) => e.day === day && e.kind !== 'weekly')
    .reduce((s, e) => s + e.amount, 0);
}

export function attributes(save: SaveData): Record<Attribute, number> {
  const result: Record<Attribute, number> = { str: 0, agi: 0, vit: 0, sen: 0 };
  for (const e of save.ledger) {
    if (e.attribute) result[e.attribute] += 1;
  }
  return result;
}

export function streakOn(save: SaveData, day: DayKey): number {
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  return currentStreak((k) => (save.days[k] ? toActivity(save, k) : undefined), day, goal);
}

export function isClaimed(save: SaveData, ref: string): boolean {
  return save.ledger.some((e) => e.ref === ref);
}

export const dailyRef = (code: DailyQuestCode, day: DayKey) => `${code}@${day}`;
export const weeklyRef = (code: WeeklyQuestCode, weekStart: DayKey) => `${code}@${weekStart}`;

export function dailyStatus(save: SaveData, day: DayKey) {
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  return evaluateDailyQuests(toActivity(save, day), goal).map((q) => ({
    ...q,
    ref: dailyRef(q.def.code, day),
    claimed: isClaimed(save, dailyRef(q.def.code, day)),
  }));
}

export function weeklyStatus(save: SaveData, day: DayKey) {
  const goal = save.player?.waterGoalMl ?? GAME_CONFIG.water.defaultGoalMl;
  const start = weekStartOf(day);
  // 只計算到今天為止的日子；未來的日子是空白
  const days = daysOfWeek(start).map((k) => toActivity(save, k));
  return evaluateWeeklyQuests(days, goal).map((q) => ({
    ...q,
    ref: weeklyRef(q.def.code, start),
    claimed: isClaimed(save, weeklyRef(q.def.code, start)),
  }));
}

export function claimableCount(save: SaveData, day: DayKey): number {
  return [...dailyStatus(save, day), ...weeklyStatus(save, day)].filter(
    (q) => q.completed && !q.claimed,
  ).length;
}

// ───────── 修改動作 ─────────

export function createPlayer(save: SaveData, player: Player): SaveData {
  return { ...save, player, lastSeenLevel: 1, inv: save.inv ?? emptyInventory() };
}

export function updatePlayer(save: SaveData, patch: Partial<Player>): SaveData {
  if (!save.player) return save;
  return { ...save, player: { ...save.player, ...patch } };
}

export function addCup(save: SaveData, day: DayKey, ml: number, now = new Date()): SaveData {
  const cup = { id: newId(), ml, at: now.toISOString() };
  let next = withDay(save, day, (log) => ({ ...log, cups: [...log.cups, cup] }));
  const w = GAME_CONFIG.water;
  const cupXpToday = save.ledger
    .filter((e) => e.day === day && e.kind === 'cup')
    .reduce((s, e) => s + e.amount, 0);
  const roomForCups = Math.max(0, w.maxCupXpPerDay - cupXpToday);
  const cap = GAME_CONFIG.dailyXpCap;
  const roomForDay = cap === null ? Infinity : Math.max(0, cap - xpEarnedOn(save, day));
  const amount = Math.min(w.xpPerCup, roomForCups, roomForDay);
  if (amount > 0) {
    const entry: LedgerEntry = {
      id: newId(),
      day,
      kind: 'cup',
      ref: cup.id,
      reason: `喝水 ${ml} ml`,
      amount,
      multiplier: 1,
      attribute: null,
      at: cup.at,
    };
    next = { ...next, ledger: [...next.ledger, entry] };
  }
  return next;
}

export function undoLastCup(save: SaveData, day: DayKey): SaveData {
  const log = getDayLog(save, day);
  const last = log.cups[log.cups.length - 1];
  if (!last) return save;
  const next = withDay(save, day, (l) => ({ ...l, cups: l.cups.slice(0, -1) }));
  return { ...next, ledger: next.ledger.filter((e) => e.ref !== last.id) };
}

export function setManualSteps(save: SaveData, day: DayKey, steps: number): SaveData {
  const value = Math.max(0, Math.min(100_000, Math.round(steps)));
  return withDay(save, day, (log) => {
    // 已有捷徑同步的步數時，不讓手動輸入覆蓋
    if (log.stepsSource === 'shortcut') return log;
    return { ...log, steps: value, stepsSource: value > 0 ? 'manual' : null };
  });
}

export function addManualWorkout(
  save: SaveData,
  day: DayKey,
  w: Omit<Workout, 'source' | 'start'>,
  now = new Date(),
): SaveData {
  const workout: Workout = {
    ...w,
    durationMin: Math.max(0, Math.min(600, Math.round(w.durationMin))),
    distanceKm: Math.max(0, Math.min(100, Math.round(w.distanceKm * 100) / 100)),
    start: now.toISOString(),
    source: 'manual',
  };
  return withDay(save, day, (log) => ({ ...log, workouts: [...log.workouts, workout] }));
}

export function removeWorkout(save: SaveData, day: DayKey, start: string): SaveData {
  return withDay(save, day, (log) => ({
    ...log,
    workouts: log.workouts.filter((w) => w.start !== start || w.synced),
  }));
}

export function completeBodyweight(save: SaveData, day: DayKey): SaveData {
  return withDay(save, day, (log) => ({ ...log, bodyweightDone: true }));
}

/** 用膳打卡：只有在時段內、且當天還沒打過卡才會寫入 */
export function logMeal(save: SaveData, day: DayKey, meal: MealId, now = new Date()): SaveData {
  const tz = save.player?.timeZone;
  if (mealWindowState(meal, now, tz) !== 'open') return save;
  if (getDayLog(save, day).meals?.[meal]) return save;
  return withDay(save, day, (log) => ({ ...log, meals: { ...log.meals, [meal]: now.toISOString() } }));
}

const MAX_TRACKS = 30;

/** 儲存一次 GPS 行功：軌跡存本機，並記為一筆運動（定位實測，修為不減半） */
export function saveTrack(save: SaveData, track: Track): SaveData {
  const tracks = [...(save.tracks ?? []), track].slice(-MAX_TRACKS);
  const next = withDay(save, track.day, (log) => ({
    ...log,
    workouts: [
      ...log.workouts,
      {
        type: track.type,
        start: track.start,
        durationMin: track.durationMin,
        distanceKm: track.distanceKm,
        source: 'gps',
      },
    ],
  }));
  return { ...next, tracks };
}

export type ImportTrackResult = { ok: true; save: SaveData; track: Track } | { ok: false; error: string };

/** 匯入其他 App 錄的 GPX 路線（螢幕關閉也能錄） */
export function importGpxTrack(
  save: SaveData,
  gpx: { name: string; start: string; end: string; movingSec: number; distanceKm: number; points: [number, number, number][] },
  type: Track['type'],
  today: DayKey,
): ImportTrackResult {
  const tz = save.player?.timeZone;
  const day = dayKeyOf(new Date(gpx.start), tz);
  if (day > today) return { ok: false, error: '路線日期在未來，請確認手機時間' };
  const startMs = Date.parse(gpx.start);
  const dup = (save.tracks ?? []).some((t) => Math.abs(Date.parse(t.start) - startMs) < 60_000);
  if (dup) return { ok: false, error: '這條路線已經匯入過了' };
  const durationMin = Math.round(gpx.movingSec / 60);
  if (durationMin < 1 || gpx.distanceKm <= 0) return { ok: false, error: '路線太短（不到 1 分鐘或沒有移動）' };
  const track: Track = {
    id: newId(),
    day,
    type,
    start: gpx.start,
    end: gpx.end,
    durationMin,
    distanceKm: gpx.distanceKm,
    points: gpx.points,
    origin: 'gpx',
    name: gpx.name,
  };
  return { ok: true, save: saveTrack(save, track), track };
}

export function deleteTrack(save: SaveData, id: string): SaveData {
  const t = save.tracks?.find((x) => x.id === id);
  if (!t) return save;
  const next = withDay(save, t.day, (log) => ({
    ...log,
    workouts: log.workouts.filter((w) => !(w.source === 'gps' && w.start === t.start)),
  }));
  return { ...next, tracks: (save.tracks ?? []).filter((x) => x.id !== id) };
}

export function restTicketsLeft(save: SaveData, day: DayKey): number {
  const used = daysOfWeek(weekStartOf(day)).filter((k) => save.days[k]?.restTicketUsed).length;
  return Math.max(0, GAME_CONFIG.restTicketsPerWeek - used);
}

export function applyRestTicket(save: SaveData, day: DayKey): SaveData {
  if (restTicketsLeft(save, day) <= 0) return save;
  return withDay(save, day, (log) => ({ ...log, restTicketUsed: true }));
}

export interface ClaimResult {
  save: SaveData;
  granted: number;
  multiplier: number;
  capped: boolean;
}

export function claimDaily(save: SaveData, day: DayKey, code: DailyQuestCode, now = new Date()): ClaimResult {
  const q = dailyStatus(save, day).find((x) => x.def.code === code);
  if (!q || !q.completed || q.claimed) return { save, granted: 0, multiplier: 1, capped: false };
  const r = grantDailyXp(q.baseXp, streakOn(save, day), xpEarnedOn(save, day));
  const entry: LedgerEntry = {
    id: newId(),
    day,
    kind: 'daily',
    ref: q.ref,
    reason: q.def.name,
    amount: r.granted,
    multiplier: r.multiplier,
    attribute: q.def.attribute,
    at: now.toISOString(),
  };
  const next = grantQuestRewards({ ...save, ledger: [...save.ledger, entry] }, stonesForQuest(q.baseXp), STAMINA_PER_CLAIM);
  return { save: next, ...r };
}

export function claimWeekly(save: SaveData, day: DayKey, code: WeeklyQuestCode, now = new Date()): ClaimResult {
  const q = weeklyStatus(save, day).find((x) => x.def.code === code);
  if (!q || !q.completed || q.claimed) return { save, granted: 0, multiplier: 1, capped: false };
  const entry: LedgerEntry = {
    id: newId(),
    day,
    kind: 'weekly',
    ref: q.ref,
    reason: q.def.name,
    amount: q.baseXp,
    multiplier: 1,
    attribute: null,
    at: now.toISOString(),
  };
  const next = grantQuestRewards({ ...save, ledger: [...save.ledger, entry] }, stonesForQuest(q.baseXp), 0);
  return { save: next, granted: q.baseXp, multiplier: 1, capped: false };
}

export function markLevelSeen(save: SaveData): SaveData {
  return { ...save, lastSeenLevel: levelInfo(totalXp(save)).level };
}

// ───────── iPhone 捷徑同步 ─────────

export function setCloudState(save: SaveData, patch: Partial<CloudState>): SaveData {
  return { ...save, cloud: { linked: false, ...save.cloud, ...patch } };
}

/**
 * 把雲端的步數與體能訓練合併進存檔：
 * - 步數以捷徑為準（覆蓋手動輸入）
 * - 先前同步的體能訓練整批替換；網頁內手動新增的保留
 * - 在「健康」App 手動輸入的紀錄視為手動（修為減半）
 */
export function applyCloudHealth(save: SaveData, daily: CloudDailyRow[], workouts: CloudWorkoutRow[]): SaveData {
  const days = new Set<string>([...daily.map((d) => d.date), ...workouts.map((w) => w.day)]);
  let next = save;
  for (const day of days) {
    const row = daily.find((d) => d.date === day);
    const synced: Workout[] = workouts
      .filter((w) => w.day === day)
      .map((w) => ({
        type: w.type,
        start: w.start_at,
        durationMin: Number(w.duration_min),
        distanceKm: Number(w.distance_km),
        source: w.manual ? 'manual' : 'shortcut',
        synced: true,
      }));
    next = withDay(next, day, (log) => ({
      ...log,
      ...(row ? { steps: Number(row.steps), stepsSource: 'shortcut' as const } : {}),
      workouts: [...log.workouts.filter((w) => !w.synced), ...synced],
    }));
  }
  const latest = daily.reduce<string | undefined>((m, d) => (!m || d.received_at > m ? d.received_at : m), save.cloud?.lastReceivedAt);
  next = setCloudState(next, { lastFetchAt: new Date().toISOString(), lastReceivedAt: latest });
  return next;
}

/** 合併結果與原本相同時回傳原物件，避免不必要的重新繪製 */
export function sameDays(a: SaveData, b: SaveData): boolean {
  return JSON.stringify(a.days) === JSON.stringify(b.days);
}

// ───────── 存檔 ─────────

const VALID_AVATARS = ['sword', 'alchemy', 'talisman', 'body'];
/** v0.1 舊造型（azure 等）改為修仙人物 */
const OLD_AVATAR_MAP: Record<string, Player['avatar']> = {
  azure: 'sword',
  violet: 'talisman',
  crimson: 'body',
  jade: 'alchemy',
};

function migrate(data: SaveData): SaveData {
  let next = data;
  if (next.player && !VALID_AVATARS.includes(next.player.avatar)) {
    const avatar = OLD_AVATAR_MAP[next.player.avatar] ?? 'sword';
    next = { ...next, player: { ...next.player, avatar } };
  }
  return migrateInventory(next);
}

const STORAGE_KEY = 'iwlu-save-v1';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, player: null, days: {}, ledger: [], lastSeenLevel: 1 };
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) throw new Error('unknown version');
    return migrate(data);
  } catch {
    return { version: 1, player: null, days: {}, ledger: [], lastSeenLevel: 1 };
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // 私密瀏覽或空間不足時忽略；畫面上仍可使用
  }
}

export function parseImport(text: string): SaveData | null {
  try {
    const data = JSON.parse(text) as SaveData;
    if (data && data.version === 1 && typeof data.days === 'object' && Array.isArray(data.ledger)) {
      return migrate(data);
    }
    return null;
  } catch {
    return null;
  }
}
