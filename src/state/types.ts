import type {
  Attribute,
  DataSource,
  DayKey,
  Difficulty,
  GearSlot,
  HerbId,
  LotCategory,
  LotRank,
  MealId,
  MealSlot,
  Nutrients,
  PillId,
  RootId,
  Workout,
  WorkoutType,
} from '../../packages/game-core/index.ts';

export type AvatarId = 'sword' | 'alchemy' | 'talisman' | 'body';

export interface Player {
  name: string;
  avatar: AvatarId;
  createdAt: string;
  weightKg: number | null;
  waterGoalMl: number;
  cupMl: number;
  difficulty: Difficulty;
  timeZone: string;
  safetyAcknowledged: boolean;
  /** 測靈根結果（v0.7 起） */
  root?: RootId;
}

export interface Cup {
  id: string;
  ml: number;
  at: string;
}

export interface DayLog {
  cups: Cup[];
  steps: number;
  stepsSource: DataSource | null;
  workouts: Workout[];
  bodyweightDone: boolean;
  restTicketUsed: boolean;
  /** 按時用膳打卡時間（v0.4 起；舊存檔可能沒有） */
  meals?: Partial<Record<MealId, string>>;
  /** 今日道心籤（v0.7 起） */
  lot?: { category: LotCategory; index: number; rank: LotRank };
  /** 修行日誌：心境 1–5 與一句話 */
  journal?: { mood: number; text: string; at: string };
  /** 今日已播放「功課圓滿」慶祝 */
  celebrated?: boolean;
  /** 今日已服用的丹藥 */
  pillTaken?: PillId;
}

/** GPS 行功軌跡（只存在本機） */
export interface Track {
  id: string;
  day: DayKey;
  type: WorkoutType;
  start: string;
  end: string;
  durationMin: number;
  distanceKm: number;
  /** [緯度, 經度, 秒（相對開始）]，座標四捨五入到小數 5 位（約 1 公尺） */
  points: [number, number, number][];
  /** live = 遊戲內行功；gpx = 從其他運動 App 匯入（v0.6 起） */
  origin?: 'live' | 'gpx';
  name?: string;
}

/** bonus = 築基里程碑、丹藥等額外修為 */
export type LedgerKind = 'cup' | 'daily' | 'weekly' | 'bonus';

export interface LedgerEntry {
  id: string;
  /** 這筆 XP 歸屬的日期（每日上限以此計算） */
  day: DayKey;
  kind: LedgerKind;
  /** 任務代碼 + 期間，例如 steps_8000@2026-11-23；喝水則為 cup id */
  ref: string;
  reason: string;
  amount: number;
  multiplier: number;
  attribute: Attribute | null;
  at: string;
}

export interface SaveData {
  version: 1;
  player: Player | null;
  days: Record<DayKey, DayLog>;
  ledger: LedgerEntry[];
  /** 已看過的等級，用來決定要不要播放升級動畫 */
  lastSeenLevel: number;
  /** iPhone 捷徑同步狀態（v0.3 起） */
  cloud?: CloudState;
  /** GPS 行功軌跡，最多保留 30 筆（v0.4 起） */
  tracks?: Track[];
  /** 六十六日築基（v0.7 起） */
  path?: PathState;
  /** 靈石、精力、靈草、丹藥、法寶（v0.7 起） */
  inv?: Inventory;
  /** 餐點與營養紀錄（v0.7 起） */
  food?: FoodEntry[];
}

export interface PathState {
  /** 這一輪的起始日 */
  start: DayKey;
  /** 第幾輪閉關（1 起） */
  round: number;
  /** 逆天模式 */
  hard: boolean;
  /** 逆天模式從哪天開始追究缺席 */
  hardSince?: DayKey;
  /** 已領取的里程碑（日數） */
  claimed: number[];
  /** 洗髓丹護道過的缺席日 */
  forgiven: DayKey[];
  /** 尚未顯示給玩家的通知（例如逆天模式重頭） */
  notice?: string;
  /** 已完成的輪數 */
  finishedRounds: number;
}

export interface Plot {
  herb: HerbId;
  plantedAt: string;
}

export interface ActiveExpedition {
  id: string;
  start: string;
  end: string;
  loot: {
    stones: number;
    herbs: Partial<Record<HerbId, number>>;
    seeds: Partial<Record<HerbId, number>>;
    story: string;
  };
}

export interface Inventory {
  stones: number;
  stamina: number;
  herbs: Partial<Record<HerbId, number>>;
  seeds: Partial<Record<HerbId, number>>;
  pills: Partial<Record<PillId, number>>;
  gear: string[];
  equipped: Partial<Record<GearSlot, string>>;
  plots: (Plot | null)[];
  expedition: ActiveExpedition | null;
  /** 最近的歷練與煉丹紀事（新的在前） */
  log: { at: string; text: string }[];
}

export interface FoodEntry extends Nutrients {
  id: string;
  day: DayKey;
  slot: MealSlot;
  at: string;
  name: string;
  items: { name: string; portion: string }[];
  vitamins: string;
  minerals: string;
  note: string;
  source: 'photo' | 'label' | 'manual';
  /** 小縮圖（data URL，約 10 KB） */
  thumb?: string;
}

export interface CloudState {
  linked: boolean;
  tokenCreatedAt?: string;
  /** 上次成功從雲端抓取的時間 */
  lastFetchAt?: string;
  /** 雲端最近一筆捷徑資料的接收時間 */
  lastReceivedAt?: string;
}

export const EMPTY_SAVE: SaveData = {
  version: 1,
  player: null,
  days: {},
  ledger: [],
  lastSeenLevel: 1,
};

export function emptyDayLog(): DayLog {
  return {
    cups: [],
    steps: 0,
    stepsSource: null,
    workouts: [],
    bodyweightDone: false,
    restTicketUsed: false,
    meals: {},
  };
}
