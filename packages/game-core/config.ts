// 遊戲數值設定：調整平衡只需要改這個檔案。
// 對應需求書 2.2、2.3、2.5、3.2、3.3。

export type Attribute = 'str' | 'agi' | 'vit' | 'sen';

/** 四項屬性的修仙名稱 */
export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  str: '體魄',
  agi: '身法',
  vit: '根骨',
  sen: '神識',
};

export type RealmId =
  | 'qi'
  | 'foundation'
  | 'core'
  | 'nascent'
  | 'spirit'
  | 'tribulation'
  | 'ascension';

/** 境界（取代原本的 E～S 階級） */
export interface RealmDef {
  id: RealmId;
  name: string;
  minLevel: number;
  /** 宗門身分稱號 */
  title: string;
}

export interface DailyQuestDef {
  code: DailyQuestCode;
  name: string;
  description: string;
  xp: number;
  attribute: Attribute | null;
}

export interface WeeklyQuestDef {
  code: WeeklyQuestCode;
  name: string;
  description: string;
  xp: number;
}

export type DailyQuestCode =
  | 'water_goal'
  | 'steps_4000'
  | 'steps_8000'
  | 'exercise_30'
  | 'bodyweight'
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_dinner';

export type MealId = 'breakfast' | 'lunch' | 'dinner';

export interface MealDef {
  id: MealId;
  name: string;
  /** 'HH:MM'（使用者時區），含開始、不含結束 */
  start: string;
  end: string;
  quest: DailyQuestCode;
}

export type WeeklyQuestCode = 'sweat_week' | 'distance_5k' | 'water_5days' | 'full_week';

export const GAME_CONFIG = {
  /** 從 Lv L 升到 L+1 所需修為（XP）= base + perLevel × L */
  levelBase: 80,
  levelPerLevel: 20,
  maxLevel: 100,

  realms: [
    { id: 'qi', name: '練氣', minLevel: 1, title: '外門弟子' },
    { id: 'foundation', name: '築基', minLevel: 10, title: '內門弟子' },
    { id: 'core', name: '金丹', minLevel: 20, title: '真傳弟子' },
    { id: 'nascent', name: '元嬰', minLevel: 35, title: '宗門長老' },
    { id: 'spirit', name: '化神', minLevel: 55, title: '太上長老' },
    { id: 'tribulation', name: '渡劫', minLevel: 80, title: '開派老祖' },
    { id: 'ascension', name: '飛升', minLevel: 100, title: '逍遙仙人' },
  ] as RealmDef[],

  water: {
    defaultGoalMl: 2000,
    mlPerKg: 30,
    maxGoalMl: 4000,
    minGoalMl: 1000,
    defaultCupMl: 250,
    xpPerCup: 5,
    maxCupXpPerDay: 40,
  },

  /** 揮汗有禮門檻（需求書 3.1） */
  sweat: {
    steps: 8000,
    exerciseMinutes: 30,
    distanceKm: 5,
  },

  /** 每日修為上限；null = 無上限（v0.5 起預設無上限） */
  dailyXpCap: null as number | null,

  /** 按時用膳：只有時段內才能打卡 */
  meals: [
    { id: 'breakfast', name: '早膳', start: '08:00', end: '09:00', quest: 'meal_breakfast' },
    { id: 'lunch', name: '午膳', start: '11:30', end: '12:30', quest: 'meal_lunch' },
    { id: 'dinner', name: '晚膳', start: '18:00', end: '19:00', quest: 'meal_dinner' },
  ] as MealDef[],
  /** 手動輸入的步數與運動，XP 打幾折 */
  manualMultiplier: 0.5,

  /** 連續天數 → 當日 XP 倍率（由高到低判斷） */
  streakBonus: [
    { days: 30, multiplier: 1.3 },
    { days: 7, multiplier: 1.2 },
    { days: 3, multiplier: 1.1 },
  ],

  restTicketsPerWeek: 1,

  dailyQuests: [
    {
      code: 'water_goal',
      name: '靈泉淬體',
      description: '今日喝水達到目標',
      xp: 20,
      attribute: 'sen',
    },
    {
      code: 'steps_4000',
      name: '踏雲初行',
      description: '單日累積 4,000 步',
      xp: 20,
      attribute: 'vit',
    },
    {
      code: 'steps_8000',
      name: '周天行功',
      description: '單日累積 8,000 步',
      xp: 40,
      attribute: 'vit',
    },
    {
      code: 'exercise_30',
      name: '兩刻苦修',
      description: '單次運動 30 分鐘以上',
      xp: 50,
      attribute: 'agi',
    },
    {
      code: 'bodyweight',
      name: '淬體功法',
      description: '完成今日徒手訓練功課',
      xp: 40,
      attribute: 'str',
    },
    {
      code: 'meal_breakfast',
      name: '辰時早膳',
      description: '08:00–09:00 按時吃早餐',
      xp: 10,
      attribute: 'vit',
    },
    {
      code: 'meal_lunch',
      name: '午時午膳',
      description: '11:30–12:30 按時吃午餐',
      xp: 10,
      attribute: 'vit',
    },
    {
      code: 'meal_dinner',
      name: '酉時晚膳',
      description: '18:00–19:00 按時吃晚餐',
      xp: 10,
      attribute: 'vit',
    },
  ] as DailyQuestDef[],

  weeklyQuests: [
    {
      code: 'sweat_week',
      name: '宗門週課',
      description: '本週任一天達成 30 分鐘、8,000 步或 5 公里（三選一）',
      xp: 150,
    },
    {
      code: 'distance_5k',
      name: '御風十里',
      description: '單次健走或跑步 5 公里',
      xp: 100,
    },
    {
      code: 'water_5days',
      name: '靈泉五日',
      description: '本週 5 天喝水達標',
      xp: 100,
    },
    {
      code: 'full_week',
      name: '閉關七日',
      description: '本週 7 天都不中斷修煉',
      xp: 150,
    },
  ] as WeeklyQuestDef[],
} as const;

export type GameConfig = typeof GAME_CONFIG;
