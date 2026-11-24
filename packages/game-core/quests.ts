// 任務判定（需求書 3.2、3.3、2.5）
import {
  GAME_CONFIG,
  type DailyQuestDef,
  type MealId,
  type WeeklyQuestDef,
} from './config.ts';
import { type DayKey } from './dates.ts';

/** shortcut = iPhone 捷徑；gps = 遊戲內行功定位；manual = 手動輸入（修為減半） */
export type DataSource = 'shortcut' | 'gps' | 'manual';
export type WorkoutType = 'walking' | 'running' | 'other';

export interface Workout {
  type: WorkoutType;
  /** ISO 時間；同一筆體能訓練以「開始時間 + 類型」辨識 */
  start: string;
  durationMin: number;
  distanceKm: number;
  source: DataSource;
  /** 由捷徑雲端同步而來（重新同步時會整批替換） */
  synced?: boolean;
}

/** 某一天的所有活動彙整 */
export interface DayActivity {
  day: DayKey;
  waterMl: number;
  cups: number;
  steps: number;
  stepsSource: DataSource | null;
  workouts: Workout[];
  bodyweightDone: boolean;
  restTicketUsed: boolean;
  /** 按時用膳打卡時間（ISO）；只有時段內才寫得進來 */
  meals: Partial<Record<MealId, string>>;
}

export function emptyDay(day: DayKey): DayActivity {
  return {
    day,
    waterMl: 0,
    cups: 0,
    steps: 0,
    stepsSource: null,
    workouts: [],
    bodyweightDone: false,
    restTicketUsed: false,
    meals: {},
  };
}

export interface QuestStatus<Def> {
  def: Def;
  current: number;
  target: number;
  unit: string;
  completed: boolean;
  /** 只有手動輸入的資料達標 → XP 打折 */
  manualOnly: boolean;
  /** 套用手動折扣後、尚未套用連續加成的 XP */
  baseXp: number;
}

function withManual(xp: number, manualOnly: boolean): number {
  return Math.round(manualOnly ? xp * GAME_CONFIG.manualMultiplier : xp);
}

function isWalkRun(w: Workout): boolean {
  return w.type === 'walking' || w.type === 'running';
}

/** 找出達標的紀錄；優先採用非手動的 */
function bestMeeting(
  workouts: Workout[],
  meets: (w: Workout) => boolean,
): { met: boolean; manualOnly: boolean } {
  const ok = workouts.filter(meets);
  if (ok.length === 0) return { met: false, manualOnly: false };
  return { met: true, manualOnly: ok.every((w) => w.source === 'manual') };
}

export function longestWorkoutMin(workouts: Workout[]): number {
  return workouts.reduce((m, w) => Math.max(m, w.durationMin), 0);
}

export function longestWalkRunKm(workouts: Workout[]): number {
  return workouts.filter(isWalkRun).reduce((m, w) => Math.max(m, w.distanceKm), 0);
}

export function evaluateDailyQuests(
  day: DayActivity,
  waterGoalMl: number,
): QuestStatus<DailyQuestDef>[] {
  const s = GAME_CONFIG.sweat;
  const stepsManual = day.stepsSource === 'manual';
  return GAME_CONFIG.dailyQuests.map((def) => {
    switch (def.code) {
      case 'water_goal': {
        const completed = day.waterMl >= waterGoalMl;
        return {
          def,
          current: day.waterMl,
          target: waterGoalMl,
          unit: 'ml',
          completed,
          manualOnly: false,
          baseXp: def.xp,
        };
      }
      case 'steps_4000':
      case 'steps_8000': {
        const target = def.code === 'steps_4000' ? 4000 : s.steps;
        const completed = day.steps >= target;
        return {
          def,
          current: day.steps,
          target,
          unit: '步',
          completed,
          manualOnly: completed && stepsManual,
          baseXp: withManual(def.xp, completed && stepsManual),
        };
      }
      case 'exercise_30': {
        const r = bestMeeting(day.workouts, (w) => w.durationMin >= s.exerciseMinutes);
        return {
          def,
          current: longestWorkoutMin(day.workouts),
          target: s.exerciseMinutes,
          unit: '分鐘',
          completed: r.met,
          manualOnly: r.manualOnly,
          baseXp: withManual(def.xp, r.manualOnly),
        };
      }
      case 'meal_breakfast':
      case 'meal_lunch':
      case 'meal_dinner': {
        const meal = GAME_CONFIG.meals.find((m) => m.quest === def.code);
        const done = !!(meal && day.meals?.[meal.id]);
        return {
          def,
          current: done ? 1 : 0,
          target: 1,
          unit: '次',
          completed: done,
          manualOnly: false,
          baseXp: def.xp,
        };
      }
      case 'bodyweight':
      default: {
        return {
          def,
          current: day.bodyweightDone ? 1 : 0,
          target: 1,
          unit: '次',
          completed: day.bodyweightDone,
          manualOnly: false,
          baseXp: def.xp,
        };
      }
    }
  });
}

/** 揮汗有禮三選一是否達成 */
export function sweatGoalMet(day: DayActivity): { met: boolean; manualOnly: boolean } {
  const s = GAME_CONFIG.sweat;
  const options: { met: boolean; manualOnly: boolean }[] = [
    { met: day.steps >= s.steps, manualOnly: day.stepsSource === 'manual' },
    bestMeeting(day.workouts, (w) => w.durationMin >= s.exerciseMinutes),
    bestMeeting(day.workouts, (w) => isWalkRun(w) && w.distanceKm >= s.distanceKm),
  ];
  const met = options.filter((o) => o.met);
  if (met.length === 0) return { met: false, manualOnly: false };
  return { met: true, manualOnly: met.every((o) => o.manualOnly) };
}

/** 這一天是否算入連續天數：喝水達標 + 任一運動任務，或使用休息日券 */
export function dayCountsForStreak(day: DayActivity | undefined, waterGoalMl: number): boolean {
  if (!day) return false;
  if (day.restTicketUsed) return true;
  const q = evaluateDailyQuests(day, waterGoalMl);
  const done = (code: string) => q.find((x) => x.def.code === code)?.completed ?? false;
  const moved = done('steps_4000') || done('exercise_30') || done('bodyweight');
  return done('water_goal') && moved;
}

export function evaluateWeeklyQuests(
  weekDays: DayActivity[],
  waterGoalMl: number,
): QuestStatus<WeeklyQuestDef>[] {
  const s = GAME_CONFIG.sweat;
  const allWorkouts = weekDays.flatMap((d) => d.workouts);
  return GAME_CONFIG.weeklyQuests.map((def) => {
    switch (def.code) {
      case 'sweat_week': {
        const results = weekDays.map(sweatGoalMet).filter((r) => r.met);
        const completed = results.length > 0;
        const manualOnly = completed && results.every((r) => r.manualOnly);
        return {
          def,
          current: results.length > 0 ? 1 : 0,
          target: 1,
          unit: '天',
          completed,
          manualOnly,
          baseXp: withManual(def.xp, manualOnly),
        };
      }
      case 'distance_5k': {
        const r = bestMeeting(allWorkouts, (w) => isWalkRun(w) && w.distanceKm >= s.distanceKm);
        return {
          def,
          current: longestWalkRunKm(allWorkouts),
          target: s.distanceKm,
          unit: '公里',
          completed: r.met,
          manualOnly: r.manualOnly,
          baseXp: withManual(def.xp, r.manualOnly),
        };
      }
      case 'water_5days': {
        const n = weekDays.filter((d) => d.waterMl >= waterGoalMl).length;
        return {
          def,
          current: n,
          target: 5,
          unit: '天',
          completed: n >= 5,
          manualOnly: false,
          baseXp: def.xp,
        };
      }
      case 'full_week':
      default: {
        const n = weekDays.filter((d) => dayCountsForStreak(d, waterGoalMl)).length;
        return {
          def,
          current: n,
          target: 7,
          unit: '天',
          completed: weekDays.length === 7 && n >= 7,
          manualOnly: false,
          baseXp: def.xp,
        };
      }
    }
  });
}
