// v0.7 修行系統：六十六日築基、測靈根、功法、歷練、法寶、靈田煉丹、道心籤。
// 只放規則與資料；存檔的讀寫在 src/state/cultivation.ts。
import { addDays, diffDays, type DayKey } from './dates.ts';
import type { Difficulty } from './bodyweight.ts';
import type { RealmId } from './config.ts';

// ───────── 六十六日築基 ─────────

export const PLAN_DAYS = 66;

/** 三個階段：每 22 天一段 */
export const PLAN_STAGES = [
  { name: '引氣', from: 1, to: 22, intro: '引天地靈氣入體，先把喝水與走動變成每天的習慣。' },
  { name: '凝元', from: 23, to: 44, intro: '靈氣凝為真元，習慣開始穩定，偶有懈怠也能拉回。' },
  { name: '築基', from: 45, to: 66, intro: '道基將成，修煉已是日常，不再需要意志力硬撐。' },
] as const;

export function planStage(dayNo: number) {
  return PLAN_STAGES.find((s) => dayNo >= s.from && dayNo <= s.to) ?? PLAN_STAGES[PLAN_STAGES.length - 1];
}

export interface PlanMilestone {
  day: number;
  name: string;
  xp: number;
  stones: number;
}

export const PLAN_MILESTONES: PlanMilestone[] = [
  { day: 7, name: '七日引氣', xp: 50, stones: 20 },
  { day: 21, name: '三七凝神', xp: 100, stones: 40 },
  { day: 33, name: '半程問道', xp: 120, stones: 50 },
  { day: 49, name: '七七歸元', xp: 150, stones: 60 },
  { day: 66, name: '道基圓成', xp: 300, stones: 120 },
];

/** 逆天模式的里程碑獎勵倍率 */
export const HARD_MODE_REWARD = 1.5;
/** 逆天模式：缺一天時損失的靈石比例 */
export const HARD_MODE_STONE_LOSS = 0.2;

export interface PlanDay {
  day: DayKey;
  /** 'done' = 功課圓滿；'rest' = 用休養符；'pause' = 閉關暫停（不前進也不算缺席）；'miss' = 缺席；'today' = 今天尚未完成 */
  state: 'done' | 'rest' | 'pause' | 'miss' | 'today';
}

export interface PlanProgress {
  /** 已完成（含休養）的天數，也就是目前築基進度 */
  completed: number;
  /** 今天是第幾日（今天已完成時 = completed） */
  dayNo: number;
  todayDone: boolean;
  /** 今天在閉關暫停中 */
  pausedToday: boolean;
  /** 自上次重新起步以來，每一天的狀態 */
  days: PlanDay[];
  /** 逆天模式下，第一個缺席的日子（需要結算） */
  firstMiss: DayKey | null;
  finished: boolean;
}

/**
 * 計算築基進度：從 start 到 today，每「圓滿」一天前進一日。
 * 一般模式缺席只是不前進；逆天模式缺席要重頭開始（由呼叫端結算）。
 */
export function planProgress(
  start: DayKey,
  today: DayKey,
  dayState: (day: DayKey) => 'done' | 'rest' | 'pause' | 'none',
): PlanProgress {
  const span = Math.max(0, diffDays(start, today));
  const days: PlanDay[] = [];
  let completed = 0;
  let firstMiss: DayKey | null = null;
  for (let i = 0; i <= span && completed < PLAN_DAYS; i++) {
    const day = addDays(start, i);
    const s = dayState(day);
    if (s === 'done' || s === 'rest') {
      completed += 1;
      days.push({ day, state: s });
    } else if (s === 'pause') {
      days.push({ day, state: 'pause' });
    } else if (day === today) {
      days.push({ day, state: 'today' });
    } else {
      days.push({ day, state: 'miss' });
      if (!firstMiss) firstMiss = day;
    }
  }
  const todayDone = days.some((d) => d.day === today && (d.state === 'done' || d.state === 'rest'));
  const pausedToday = days.some((d) => d.day === today && d.state === 'pause');
  const finished = completed >= PLAN_DAYS;
  return {
    completed,
    dayNo: finished ? PLAN_DAYS : todayDone ? completed : completed + 1,
    todayDone,
    pausedToday,
    days,
    firstMiss,
    finished,
  };
}

/** 66 則每日心法（每天一句，循環使用 22 則） */
export const DAILY_TIPS = [
  '今日只求一件事做到：起床先喝一杯水。',
  '把水杯放在視線內，看見就喝一口。',
  '飯後散步十分鐘，比一次走一小時更容易持續。',
  '設定一個固定的「行功時辰」，讓身體記住。',
  '累了就做最簡單的版本，但不要讓今天歸零。',
  '記下今天做到的一件小事，道心從這裡長出來。',
  '搭電梯改走一層樓梯，積少成多。',
  '早膳別省，辰時進食讓一天的氣力有根。',
  '睡前把明天的運動衣放好，減少開始的阻力。',
  '今天若很忙，三分鐘淬體也算數。',
  '和一位朋友說你在修煉，讓承諾有人見證。',
  '喝水跟著時辰走：每個整點一口。',
  '走路時放下手機，專心感受呼吸與步伐。',
  '習慣不是靠意志力，而是靠「不用想就去做」。',
  '缺了一天沒關係，重要的是不要連缺兩天。',
  '今天比昨天多走五百步，就是進境。',
  '午膳後站起來動一動，避免靈氣淤滯。',
  '把目標說得具體：何時、何地、做什麼。',
  '晚膳七分飽，夜裡修煉更清明。',
  '回頭看看路線圖，你已經走了這麼遠。',
  '給完成的自己一點獎勵，但別拿暴飲暴食當獎勵。',
  '休息也是修煉的一部分，休養符用得其所即可。',
];

export function tipForDay(dayNo: number): string {
  return DAILY_TIPS[(Math.max(1, dayNo) - 1) % DAILY_TIPS.length];
}

// ───────── 閉關（暫停） ─────────

/** 單次閉關最多幾天 */
export const PAUSE_MAX_DAYS = 14;
/** 兩次閉關之間至少要修煉幾天 */
export const PAUSE_GAP_DAYS = 3;

export interface PauseRange {
  start: DayKey;
  /** 含當天 */
  end: DayKey;
  reason: string;
}

export const PAUSE_REASONS = ['出遊', '生病休養', '工作繁忙', '其他'];

export function isDayPaused(pauses: PauseRange[] | undefined, day: DayKey): boolean {
  return (pauses ?? []).some((p) => day >= p.start && day <= p.end);
}

export function activePause(pauses: PauseRange[] | undefined, today: DayKey): PauseRange | undefined {
  return (pauses ?? []).find((p) => today >= p.start && today <= p.end);
}

// ───────── 測靈根（入門問心） ─────────

export type RootId = 'water' | 'wood' | 'fire' | 'earth' | 'metal';

export interface QuizOption {
  label: string;
  /** 各靈根的加分 */
  score: Partial<Record<RootId, number>>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export const ROOT_QUIZ: QuizQuestion[] = [
  {
    id: 'activity',
    question: '平日的活動量大概是？',
    options: [
      { label: '幾乎整天坐著', score: { wood: 2 } },
      { label: '偶爾走走路', score: { wood: 1, earth: 1 } },
      { label: '每週運動兩三次', score: { metal: 1, fire: 1 } },
      { label: '幾乎天天運動', score: { fire: 2, metal: 1 } },
    ],
  },
  {
    id: 'water',
    question: '一天大約喝幾杯水（一杯約 250 ml）？',
    options: [
      { label: '不到 4 杯', score: { water: 3 } },
      { label: '4～7 杯', score: { water: 1 } },
      { label: '8 杯以上', score: { metal: 1 } },
    ],
  },
  {
    id: 'meals',
    question: '三餐的時間規律嗎？',
    options: [
      { label: '常常不吃早餐', score: { earth: 2 } },
      { label: '時間不太固定', score: { earth: 1 } },
      { label: '很規律', score: { metal: 1 } },
    ],
  },
  {
    id: 'goal',
    question: '最想改變的是？',
    options: [
      { label: '精神與體力', score: { water: 1, fire: 1 } },
      { label: '體態與肌力', score: { metal: 2 } },
      { label: '作息與飲食', score: { earth: 2 } },
      { label: '壓力與心情', score: { wood: 2 } },
    ],
  },
  {
    id: 'quit',
    question: '以前放棄習慣，最常是因為？',
    options: [
      { label: '太忙沒時間', score: { fire: 1 } },
      { label: '懶得開始', score: { wood: 1 } },
      { label: '看不到成果', score: { metal: 1 } },
      { label: '容易忘記', score: { water: 1, earth: 1 } },
    ],
  },
];

export interface RootDef {
  id: RootId;
  name: string;
  color: string;
  strength: string;
  blindSpot: string;
  focus: string[];
}

export const ROOTS: Record<RootId, RootDef> = {
  water: {
    id: 'water',
    name: '水靈根',
    color: '#5bb8e8',
    strength: '心思細膩、適應力強，一旦形成習慣就很穩定。',
    blindSpot: '身體常處於缺水狀態而不自知，疲倦與分心多半由此而來。',
    focus: ['先把「靈泉淬體」每天做到', '起床、午膳、下午各喝一大杯', '把杯量設成常用的水杯'],
  },
  wood: {
    id: 'wood',
    name: '木靈根',
    color: '#5fd4b0',
    strength: '耐性好、能循序漸進，適合長期的六十六日築基。',
    blindSpot: '久坐、起步難，常想著「等有空再開始」。',
    focus: ['先完成「踏雲初行」4,000 步', '淬體功法從入門開始', '每天固定一個行功時辰'],
  },
  fire: {
    id: 'fire',
    name: '火靈根',
    color: '#f2785c',
    strength: '行動力強、運動底子好，衝勁十足。',
    blindSpot: '容易一次練太猛，忙起來就整週停擺。',
    focus: ['目標放在「兩刻苦修」與「周天行功」', '忙碌時用三分鐘淬體保住連修', '善用每週一張休養符'],
  },
  earth: {
    id: 'earth',
    name: '土靈根',
    color: '#d9b45a',
    strength: '務實可靠，生活一旦有規律就能長久維持。',
    blindSpot: '作息與三餐不定時，讓精神起伏不穩。',
    focus: ['把三餐按時用膳當主線', '記錄餐點，看看五大營養素', '晚上寫一句修行日誌'],
  },
  metal: {
    id: 'metal',
    name: '金靈根',
    color: '#e6e1d3',
    strength: '目標明確、重視成果，喜歡看到數字進步。',
    blindSpot: '看不到成果時容易失去動力。',
    focus: ['淬體功法挑戰進階難度', '每週完成「御風十里」', '常看功法與路線圖的進度'],
  },
};

export interface QuizResult {
  root: RootId;
  difficulty: Difficulty;
  /** 建議提醒（依放棄原因） */
  advice: string;
}

const QUIT_ADVICE: Record<string, string> = {
  太忙沒時間: '忙碌時就做最小版本：一杯水加三分鐘淬體，也能保住連修。',
  懶得開始: '把開始的門檻降到最低：先穿上鞋，走出門再說。',
  看不到成果: '多看「修行」頁的路線圖和功法等級，進步都記在那裡。',
  容易忘記: '在 iPhone「提醒事項」設三個鬧鐘：早膳、午後喝水、晚上行功。',
};

/** answers：每題選的選項索引 */
export function scoreRootQuiz(answers: number[]): QuizResult {
  const total: Record<RootId, number> = { water: 0, wood: 0, fire: 0, earth: 0, metal: 0 };
  ROOT_QUIZ.forEach((q, i) => {
    const opt = q.options[answers[i] ?? 0] ?? q.options[0];
    for (const [k, v] of Object.entries(opt.score)) total[k as RootId] += v ?? 0;
  });
  // 同分時依固定順序：水 > 土 > 木 > 火 > 金（先補最基本的）
  const order: RootId[] = ['water', 'earth', 'wood', 'fire', 'metal'];
  const root = order.reduce((best, k) => (total[k] > total[best] ? k : best), order[0]);
  const activity = answers[0] ?? 0;
  const difficulty: Difficulty = activity >= 3 ? 'advanced' : activity >= 2 ? 'intermediate' : 'beginner';
  const quitLabel = ROOT_QUIZ[4].options[answers[4] ?? 0]?.label ?? '';
  return { root, difficulty, advice: QUIT_ADVICE[quitLabel] ?? QUIT_ADVICE['容易忘記'] };
}

// ───────── 功法（技能） ─────────

export type SkillId = 'spring' | 'wind' | 'diamond' | 'nourish' | 'calm';

export interface SkillDef {
  id: SkillId;
  name: string;
  trains: string;
  effect: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'spring', name: '靈泉訣', trains: '喝水達標的日子', effect: '每重：歷練靈石 +3%' },
  { id: 'wind', name: '御風步', trains: '步數與行走距離', effect: '每重：歷練時間 −2%' },
  { id: 'diamond', name: '金剛體', trains: '完成淬體功法', effect: '每重：歷練靈石 +3%' },
  { id: 'nourish', name: '養生道', trains: '按時用膳與餐點紀錄', effect: '每重：靈田收成機率 +5%' },
  { id: 'calm', name: '定心訣', trains: '修行日誌與道心籤', effect: '每重：煉丹成功率 +2%' },
];

export const SKILL_MAX = 9;
export const SKILL_TIERS = ['未入門', '一重', '二重', '三重', '四重', '五重', '六重', '七重', '八重', '九重・圓滿'];

/** 升到第 n 重需要的累積點數：5 × n(n+1)/2（5、15、30、50…225） */
export function skillPointsFor(level: number): number {
  return (5 * level * (level + 1)) / 2;
}

export function skillLevel(points: number): { level: number; into: number; need: number } {
  let level = 0;
  while (level < SKILL_MAX && points >= skillPointsFor(level + 1)) level += 1;
  if (level >= SKILL_MAX) return { level, into: 0, need: 0 };
  return { level, into: points - skillPointsFor(level), need: skillPointsFor(level + 1) - skillPointsFor(level) };
}

// ───────── 法寶 ─────────

export type GearSlot = 'head' | 'robe' | 'waist' | 'feet' | 'relic';

export const GEAR_SLOT_LABEL: Record<GearSlot, string> = {
  head: '頭冠',
  robe: '法衣',
  waist: '腰佩',
  feet: '足履',
  relic: '法器',
};

export type GearEffect = 'stones' | 'speed' | 'harvest' | 'alchemy' | 'loot';

export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  price: number;
  /** 需要的境界 */
  realm: RealmId;
  effect: GearEffect;
  /** stones/speed/alchemy：百分比；harvest/loot：件數 */
  value: number;
  desc: string;
  color: string;
  /** 有配方的法寶要用靈草「煉器」，price 為另需的靈石 */
  recipe?: Partial<Record<HerbId, number>>;
}

export const GEAR: GearDef[] = [
  { id: 'jade_pin', name: '青玉簪', slot: 'head', price: 60, realm: 'qi', effect: 'stones', value: 10, desc: '歷練所得靈石 +10%', color: '#5fd4b0' },
  { id: 'gold_crown', name: '紫金冠', slot: 'head', price: 300, realm: 'foundation', effect: 'stones', value: 25, desc: '歷練所得靈石 +25%', color: '#f2c94c' },
  { id: 'cloud_robe', name: '雲紋法衣', slot: 'robe', price: 120, realm: 'qi', effect: 'speed', value: 10, desc: '歷練時間 −10%', color: '#9fe8ff' },
  { id: 'star_robe', name: '星河道袍', slot: 'robe', price: 500, realm: 'core', effect: 'speed', value: 25, desc: '歷練時間 −25%', color: '#b28dff' },
  { id: 'warm_jade', name: '暖玉佩', slot: 'waist', price: 80, realm: 'qi', effect: 'harvest', value: 1, desc: '靈田每次收成 +1 株', color: '#8fe3c4' },
  { id: 'cosmos_bag', name: '乾坤袋', slot: 'waist', price: 400, realm: 'foundation', effect: 'loot', value: 1, desc: '歷練額外帶回 1 份靈草', color: '#c9a85c' },
  { id: 'gourd', name: '紫金葫蘆', slot: 'relic', price: 200, realm: 'qi', effect: 'alchemy', value: 10, desc: '煉丹成功率 +10%', color: '#d6a14a' },
  { id: 'thunder_bell', name: '九霄雷鈴', slot: 'relic', price: 800, realm: 'nascent', effect: 'alchemy', value: 25, desc: '煉丹成功率 +25%', color: '#a78bfa' },
  // 煉器：用靈田種出的靈草打造
  { id: 'cloud_boots', name: '踏雲靴', slot: 'feet', price: 30, realm: 'qi', effect: 'speed', value: 8, desc: '歷練時間 −8%', color: '#bfefff', recipe: { calm_grass: 4 } },
  { id: 'flame_boots', name: '赤焰靴', slot: 'feet', price: 80, realm: 'foundation', effect: 'speed', value: 15, desc: '歷練時間 −15%', color: '#f2785c', recipe: { sun_flower: 3, ice_lotus: 1 } },
  { id: 'herb_robe', name: '百草法衣', slot: 'robe', price: 60, realm: 'qi', effect: 'harvest', value: 1, desc: '靈田每次收成 +1 株', color: '#7fd99a', recipe: { calm_grass: 3, sun_flower: 2 } },
  { id: 'frost_crown', name: '寒玉冠', slot: 'head', price: 120, realm: 'core', effect: 'stones', value: 20, desc: '歷練所得靈石 +20%', color: '#9fd8ff', recipe: { ice_lotus: 3, sun_flower: 1 } },
];

export function gearById(id: string | null | undefined): GearDef | undefined {
  return GEAR.find((g) => g.id === id);
}

// ───────── 靈草、靈田與煉丹 ─────────

export type HerbId = 'calm_grass' | 'sun_flower' | 'ice_lotus';

export interface HerbDef {
  id: HerbId;
  name: string;
  seedPrice: number;
  growHours: number;
  yield: number;
  color: string;
}

export const HERBS: HerbDef[] = [
  { id: 'calm_grass', name: '寧神草', seedPrice: 5, growHours: 2, yield: 2, color: '#7fd99a' },
  { id: 'sun_flower', name: '赤陽花', seedPrice: 12, growHours: 6, yield: 2, color: '#f2785c' },
  { id: 'ice_lotus', name: '冰心蓮', seedPrice: 25, growHours: 12, yield: 2, color: '#9fd8ff' },
];

export function herbById(id: HerbId): HerbDef {
  return HERBS.find((h) => h.id === id) ?? HERBS[0];
}

/** 靈田格數：練氣 3 格，築基起 4 格 */
export function plotCount(realmIdx: number): number {
  return realmIdx >= 1 ? 4 : 3;
}

export type PillId = 'qi_pill' | 'gather_pill' | 'foundation_pill' | 'marrow_pill';

export interface PillDef {
  id: PillId;
  name: string;
  recipe: Partial<Record<HerbId, number>>;
  effect: string;
  /** 服用後得到的修為（0 = 特殊效果） */
  xp: number;
  /** 服用後得到的精力 */
  stamina: number;
}

export const PILLS: PillDef[] = [
  { id: 'qi_pill', name: '回氣丹', recipe: { calm_grass: 3 }, effect: '精力 +2', xp: 0, stamina: 2 },
  { id: 'gather_pill', name: '聚靈丹', recipe: { calm_grass: 2, sun_flower: 1 }, effect: '修為 +30', xp: 30, stamina: 0 },
  { id: 'foundation_pill', name: '築基丹', recipe: { sun_flower: 2, ice_lotus: 1 }, effect: '修為 +100', xp: 100, stamina: 0 },
  { id: 'marrow_pill', name: '洗髓丹', recipe: { ice_lotus: 3 }, effect: '逆天模式缺席一天時自動護道，不重頭', xp: 0, stamina: 0 },
];

export function pillById(id: PillId): PillDef {
  return PILLS.find((p) => p.id === id) ?? PILLS[0];
}

/** 每天最多服用幾顆丹藥（避免只靠煉丹升級） */
export const PILLS_PER_DAY = 1;
export const ALCHEMY_BASE_RATE = 80;

// ───────── 出門歷練 ─────────

export interface ExpeditionDef {
  id: string;
  name: string;
  hours: number;
  stamina: number;
  realm: RealmId;
  stones: [number, number];
  /** 可能帶回的靈草 */
  herbs: HerbId[];
  foes: string[];
}

export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'stone_hill', name: '青石山', hours: 1, stamina: 1, realm: 'qi', stones: [4, 8], herbs: ['calm_grass'], foes: ['山魈', '石甲蟲', '野狐'] },
  { id: 'sunset_valley', name: '落霞谷', hours: 4, stamina: 2, realm: 'qi', stones: [12, 22], herbs: ['calm_grass', 'sun_flower'], foes: ['赤焰狼', '霞光蝶妖', '谷中劫修'] },
  { id: 'demon_forest', name: '萬妖林', hours: 8, stamina: 3, realm: 'foundation', stones: [28, 45], herbs: ['sun_flower', 'ice_lotus'], foes: ['千年樹妖', '玄鱗蟒', '鬼面梟'] },
  { id: 'east_sea', name: '東海秘境', hours: 12, stamina: 4, realm: 'core', stones: [50, 80], herbs: ['ice_lotus', 'sun_flower'], foes: ['蛟龍分身', '海市蜃妖', '上古傀儡'] },
];

export const STAMINA_MAX = 10;

export interface ExpeditionBonus {
  /** 靈石加成百分比 */
  stonesPct: number;
  /** 時間縮短百分比（最多 50） */
  speedPct: number;
  extraHerbs: number;
}

export interface ExpeditionLoot {
  stones: number;
  herbs: Partial<Record<HerbId, number>>;
  seeds: Partial<Record<HerbId, number>>;
  story: string;
}

/** 出發時就決定戰利品（rng 由外部傳入，方便測試、也避免重開刷獎勵） */
export function rollExpedition(def: ExpeditionDef, bonus: ExpeditionBonus, rng: () => number): ExpeditionLoot {
  const [lo, hi] = def.stones;
  const base = lo + Math.floor(rng() * (hi - lo + 1));
  const stones = Math.round(base * (1 + bonus.stonesPct / 100));
  const herbs: Partial<Record<HerbId, number>> = {};
  const seeds: Partial<Record<HerbId, number>> = {};
  const pick = () => def.herbs[Math.floor(rng() * def.herbs.length)];
  const herbCount = 1 + (rng() < 0.4 ? 1 : 0) + bonus.extraHerbs;
  for (let i = 0; i < herbCount; i++) {
    const h = pick();
    herbs[h] = (herbs[h] ?? 0) + 1;
  }
  if (rng() < 0.5) {
    const s = pick();
    seeds[s] = (seeds[s] ?? 0) + 1;
  }
  const foe = def.foes[Math.floor(rng() * def.foes.length)];
  const story = `於${def.name}遭遇${foe}，力戰而勝，得靈石 ${stones} 枚。`;
  return { stones, herbs, seeds, story };
}

export function expeditionDurationMs(def: ExpeditionDef, speedPct: number): number {
  const pct = Math.min(50, Math.max(0, speedPct));
  return Math.round(def.hours * 3_600_000 * (1 - pct / 100));
}

// ───────── 靈石 ─────────

/** 領取功課時給的靈石：每 10 修為 1 枚，至少 1 枚 */
export function stonesForQuest(xp: number): number {
  return Math.max(1, Math.round(xp / 10));
}

/** 每領取一項每日功課得 1 點精力 */
export const STAMINA_PER_CLAIM = 1;

// ───────── 道心籤 ─────────

export type LotCategory = 'courage' | 'strength' | 'discipline' | 'wisdom' | 'focus';

export const LOT_CATEGORY: Record<LotCategory, { name: string; color: string }> = {
  courage: { name: '勇', color: '#f2785c' },
  strength: { name: '力', color: '#d9b45a' },
  discipline: { name: '律', color: '#5fd4b0' },
  wisdom: { name: '慧', color: '#9fd8ff' },
  focus: { name: '定', color: '#b28dff' },
};

export const LOTS: Record<LotCategory, string[]> = {
  courage: [
    '千里之行，始於一步。今日先邁出那一步。',
    '心中所懼，多半比眼前所見更大。',
    '不必等到準備好，邊走邊修亦是道。',
    '敢於重新開始的人，從未真正失敗。',
    '今日之難，是明日之階。',
    '劍未出鞘，勝負未分；出鞘了，才有勝算。',
  ],
  strength: [
    '筋骨在一次次起落中長成，不在一夜之間。',
    '多走一步，氣血便多通一分。',
    '體魄是道心的居所，善養之。',
    '汗水落地之處，便是修為生根之處。',
    '今日的痠痛，是昨日不曾到過的境界。',
    '力不在猛，而在不斷。',
  ],
  discipline: [
    '修行不在一日千里，而在日日不輟。',
    '把該做的事放在固定的時辰，道自然成。',
    '小事守得住，大事才守得住。',
    '缺一日無妨，缺兩日便成習。今日回來吧。',
    '先做，再想要不要做。',
    '規矩不是枷鎖，是讓你少花力氣的路。',
  ],
  wisdom: [
    '知道為何而修，便不怕路遠。',
    '身體會說話，學會聽它說累、說渴、說餓。',
    '過猶不及，休養亦是功課。',
    '看清自己的盲點，比追趕別人更重要。',
    '飲食有節，起居有常，不妄作勞。',
    '今日所學，明日可用；今日所修，終身受益。',
  ],
  focus: [
    '一念專注，萬法自來。',
    '走路時只走路，喝水時只喝水。',
    '雜念如雲，看著它飄過便好。',
    '少看一眼螢幕，多看一眼天空。',
    '心定則氣定，氣定則神清。',
    '今日只做一件事，並把它做好。',
  ],
};

export type LotRank = '上上籤' | '上籤' | '中籤';

/** 抽籤：rng 由外部傳入 */
export function drawLot(rng: () => number): { category: LotCategory; index: number; rank: LotRank; stones: number } {
  const cats = Object.keys(LOTS) as LotCategory[];
  const category = cats[Math.floor(rng() * cats.length)];
  const index = Math.floor(rng() * LOTS[category].length);
  const r = rng();
  const rank: LotRank = r < 0.1 ? '上上籤' : r < 0.45 ? '上籤' : '中籤';
  const stones = rank === '上上籤' ? 5 : rank === '上籤' ? 3 : 2;
  return { category, index, rank, stones };
}

// ───────── 修行日誌 ─────────

export const MOODS = [
  { value: 1, name: '心魔', emoji: '🌑' },
  { value: 2, name: '浮躁', emoji: '🌘' },
  { value: 3, name: '平常', emoji: '🌗' },
  { value: 4, name: '清明', emoji: '🌖' },
  { value: 5, name: '通透', emoji: '🌕' },
] as const;

export const JOURNAL_STONES = 2;
export const JOURNAL_MAX_CHARS = 500;

/** 每日問心：每天一題反思提示 */
export const REFLECTION_PROMPTS = [
  '今天身體哪裡感覺最輕鬆？是因為做了什麼？',
  '今天有哪一刻，你差點放棄但還是做了？',
  '今天喝水、走路、吃飯，哪一項最容易？哪一項最難？',
  '如果明天只能做好一件事，你會選哪一件？',
  '今天有什麼讓你分心？下次可以怎麼避開？',
  '今天你對自己說過最溫柔的一句話是什麼？',
  '最近睡得好嗎？睡前可以少做哪一件事？',
  '今天吃的哪一餐讓你吃完最有精神？',
  '今天有沒有一個小小的進步，值得記下來？',
  '是什麼讓你今天願意打開這個修煉？',
  '今天的心情像什麼天氣？為什麼？',
  '這週的自己，跟上週比有什麼不同？',
  '有哪個習慣，你其實已經不用想就會做了？',
  '今天有誰讓你覺得被支持？',
  '如果把今天的疲累分成三份，各來自哪裡？',
  '今天走路時，你注意到了什麼風景？',
  '有什麼事你一直拖著？拆成最小的第一步是什麼？',
  '今天身體給了你什麼訊號：渴、累、餓，還是緊繃？',
  '對三十天後的自己，你想說什麼？',
  '今天有沒有哪個時刻，你完全專注在當下？',
  '今天做得不夠好的地方，換成朋友會怎麼安慰你？',
  '你理想中的一天早晨長什麼樣子？今天離它多遠？',
  '今天有什麼讓你笑了？',
  '最近最想感謝自己的一件事是什麼？',
  '有什麼「應該做」其實可以放下？',
  '這個月最想養成的一個小習慣是什麼？',
  '今天你給了身體什麼好東西？',
  '如果今天重來一次，你會改變哪一個選擇？',
  '是什麼讓你覺得自己在變強？',
  '今晚睡前，想放下哪一件心事？',
];

/** 依日期決定當天的問心題（同一天固定同一題） */
export function promptForDay(day: DayKey): string {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return REFLECTION_PROMPTS[h % REFLECTION_PROMPTS.length];
}

/** 由 32 位元種子產生的可重現亂數（mulberry32） */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
