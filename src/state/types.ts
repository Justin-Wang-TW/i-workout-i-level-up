import type {
  Attribute,
  DataSource,
  DayKey,
  Difficulty,
  MealId,
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

export type LedgerKind = 'cup' | 'daily' | 'weekly';

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
