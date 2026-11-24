import { describe, expect, it } from 'vitest';
import {
  addDays,
  cumulativeXpForLevel,
  currentStreak,
  dailyMenu,
  dayCountsForStreak,
  dayKeyOf,
  emptyDay,
  evaluateDailyQuests,
  evaluateWeeklyQuests,
  grantDailyXp,
  isValidDayKey,
  localTimeHHMM,
  mealWindowState,
  openMeal,
  levelFromXp,
  levelInfo,
  realmForLevel,
  realmStage,
  streakMultiplier,
  waterGoalFromWeight,
  weekStartOf,
  daysOfWeek,
  type DayActivity,
  type Workout,
} from './index.ts';

const GOAL = 2000;

function day(key: string, patch: Partial<DayActivity> = {}): DayActivity {
  return { ...emptyDay(key), ...patch };
}

function workout(patch: Partial<Workout>): Workout {
  return {
    type: 'running',
    start: '2026-11-23T19:00:00+08:00',
    durationMin: 0,
    distanceKm: 0,
    source: 'shortcut',
    ...patch,
  };
}

describe('等級公式', () => {
  it('累積 XP 符合需求書 2.3 表格', () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(10)).toBe(1620);
    expect(cumulativeXpForLevel(20)).toBe(5320);
    expect(cumulativeXpForLevel(35)).toBe(14620);
    expect(cumulativeXpForLevel(55)).toBe(34020);
    expect(cumulativeXpForLevel(80)).toBe(69520);
  });

  it('剛好達到門檻時升級，少 1 XP 時不升級', () => {
    expect(levelFromXp(1619)).toBe(9);
    expect(levelFromXp(1620)).toBe(10);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-50)).toBe(1);
  });

  it('等級上限 100', () => {
    expect(levelFromXp(10_000_000)).toBe(100);
    expect(levelInfo(10_000_000).isMax).toBe(true);
  });

  it('境界邊界', () => {
    expect(realmForLevel(9).name).toBe('練氣');
    expect(realmForLevel(10).name).toBe('築基');
    expect(realmForLevel(20).name).toBe('金丹');
    expect(realmForLevel(79).name).toBe('化神');
    expect(realmForLevel(80).name).toBe('渡劫');
    expect(realmForLevel(100).name).toBe('飛升');
  });

  it('境界小階段', () => {
    expect(realmStage(1).label).toBe('練氣一層');
    expect(realmStage(9).label).toBe('練氣九層');
    expect(realmStage(10).label).toBe('築基初期');
    expect(realmStage(14).label).toBe('築基中期');
    expect(realmStage(18).label).toBe('築基後期');
    expect(realmStage(19).label).toBe('築基大圓滿');
    expect(realmStage(99).label).toBe('渡劫大圓滿');
    expect(realmStage(100).label).toBe('飛升仙界');
  });

  it('進度條數值', () => {
    const info = levelInfo(100 + 50); // Lv2 起點 100，Lv2→3 需要 120
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(50);
    expect(info.xpForThisLevel).toBe(120);
  });
});

describe('日期', () => {
  it('台北時區跨日', () => {
    // UTC 2026-11-23 16:30 = 台北 11/24 00:30
    expect(dayKeyOf(new Date('2026-11-23T16:30:00Z'), 'Asia/Taipei')).toBe('2026-11-24');
    expect(dayKeyOf(new Date('2026-11-23T15:59:00Z'), 'Asia/Taipei')).toBe('2026-11-23');
  });

  it('週一為一週開始', () => {
    expect(weekStartOf('2026-11-23')).toBe('2026-11-23'); // 週一
    expect(weekStartOf('2026-11-29')).toBe('2026-11-23'); // 週日
    expect(weekStartOf('2026-11-30')).toBe('2026-11-30');
    expect(daysOfWeek('2026-11-23')).toHaveLength(7);
  });

  it('跨月與日期驗證', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(isValidDayKey('2026-02-30')).toBe(false);
    expect(isValidDayKey('2026-11-23')).toBe(true);
  });
});

describe('每日任務', () => {
  const find = (d: DayActivity, code: string) =>
    evaluateDailyQuests(d, GOAL).find((q) => q.def.code === code)!;

  it('8,000 步邊界', () => {
    expect(find(day('2026-11-23', { steps: 7999, stepsSource: 'shortcut' }), 'steps_8000').completed).toBe(false);
    expect(find(day('2026-11-23', { steps: 8000, stepsSource: 'shortcut' }), 'steps_8000').completed).toBe(true);
  });

  it('手動輸入步數 XP 打 5 折', () => {
    const q = find(day('2026-11-23', { steps: 9000, stepsSource: 'manual' }), 'steps_8000');
    expect(q.completed).toBe(true);
    expect(q.manualOnly).toBe(true);
    expect(q.baseXp).toBe(20);
  });

  it('30 分鐘邊界，且優先採用捷徑紀錄', () => {
    expect(find(day('d', { workouts: [workout({ durationMin: 29 })] }), 'exercise_30').completed).toBe(false);
    const both = find(
      day('d', {
        workouts: [workout({ durationMin: 40, source: 'manual' }), workout({ durationMin: 30 })],
      }),
      'exercise_30',
    );
    expect(both.completed).toBe(true);
    expect(both.manualOnly).toBe(false);
    expect(both.baseXp).toBe(50);
  });

  it('喝水達標', () => {
    expect(find(day('d', { waterMl: 1999 }), 'water_goal').completed).toBe(false);
    expect(find(day('d', { waterMl: 2000 }), 'water_goal').completed).toBe(true);
  });
});

describe('連續天數與 XP', () => {
  const good = (key: string) => day(key, { waterMl: 2000, bodyweightDone: true });

  it('喝水 + 任一運動才算一天', () => {
    expect(dayCountsForStreak(day('d', { waterMl: 2000 }), GOAL)).toBe(false);
    expect(dayCountsForStreak(good('d'), GOAL)).toBe(true);
    expect(dayCountsForStreak(day('d', { restTicketUsed: true }), GOAL)).toBe(true);
  });

  it('今天還沒完成時，昨天以前的連續紀錄仍有效', () => {
    const today = '2026-11-23';
    const map = new Map<string, DayActivity>();
    for (let i = 1; i <= 7; i += 1) map.set(addDays(today, -i), good(addDays(today, -i)));
    expect(currentStreak((k) => map.get(k), today, GOAL)).toBe(7);
    map.set(today, good(today));
    expect(currentStreak((k) => map.get(k), today, GOAL)).toBe(8);
    map.delete(addDays(today, -3));
    expect(currentStreak((k) => map.get(k), today, GOAL)).toBe(3);
  });

  it('加成倍率', () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.1);
    expect(streakMultiplier(7)).toBe(1.2);
    expect(streakMultiplier(30)).toBe(1.3);
    expect(streakMultiplier(365)).toBe(1.3);
  });

  it('預設沒有每日上限', () => {
    expect(grantDailyXp(50, 0, 0).granted).toBe(50);
    expect(grantDailyXp(50, 7, 0).granted).toBe(60);
    const r = grantDailyXp(50, 0, 1000);
    expect(r.granted).toBe(50);
    expect(r.capped).toBe(false);
  });

  it('若設定上限仍可截斷（保留給日後調整）', () => {
    const r = grantDailyXp(50, 0, 280, 300);
    expect(r.granted).toBe(20);
    expect(r.capped).toBe(true);
    expect(grantDailyXp(50, 0, 300, 300).granted).toBe(0);
  });

  it('體重換算喝水目標', () => {
    expect(waterGoalFromWeight(null)).toBe(2000);
    expect(waterGoalFromWeight(60)).toBe(1800);
    expect(waterGoalFromWeight(200)).toBe(4000);
    expect(waterGoalFromWeight(20)).toBe(1000);
  });
});

describe('每週任務', () => {
  const week = daysOfWeek('2026-11-23').map((k) => day(k));
  const get = (days: DayActivity[], code: string) =>
    evaluateWeeklyQuests(days, GOAL).find((q) => q.def.code === code)!;

  it('揮汗週任務：任一天三選一', () => {
    expect(get(week, 'sweat_week').completed).toBe(false);
    const w = [...week];
    w[2] = day(w[2].day, { workouts: [workout({ type: 'walking', distanceKm: 5, durationMin: 20 })] });
    expect(get(w, 'sweat_week').completed).toBe(true);
    expect(get(w, 'distance_5k').completed).toBe(true);
  });

  it('其他類運動的距離不算 5 公里任務', () => {
    const w = [...week];
    w[0] = day(w[0].day, { workouts: [workout({ type: 'other', distanceKm: 15 })] });
    expect(get(w, 'distance_5k').completed).toBe(false);
  });

  it('水之守護者需要 5 天', () => {
    const w = week.map((d, i) => (i < 4 ? { ...d, waterMl: 2500 } : d));
    expect(get(w, 'water_5days').completed).toBe(false);
    w[4] = { ...w[4], waterMl: 2000 };
    expect(get(w, 'water_5days').completed).toBe(true);
  });
});

describe('徒手菜單', () => {
  it('同一天同難度菜單固定，且有 4 個不重複動作', () => {
    const a = dailyMenu('2026-11-23', 'beginner');
    const b = dailyMenu('2026-11-23', 'beginner');
    expect(a.map((m) => m.exercise.id)).toEqual(b.map((m) => m.exercise.id));
    expect(new Set(a.map((m) => m.exercise.id)).size).toBe(4);
  });

  it('難度影響次數', () => {
    const easy = dailyMenu('2026-11-23', 'beginner');
    const hard = dailyMenu('2026-11-23', 'advanced');
    expect(easy.length).toBe(4);
    expect(hard.length).toBe(4);
    expect(hard.every((m) => m.amount >= m.exercise.amount.beginner)).toBe(true);
  });
});

describe('按時用膳', () => {
  // 台北時間 = UTC + 8
  const at = (hhmm: string) => new Date(`2026-11-24T${hhmm}:00+08:00`);

  it('台北時間換算', () => {
    expect(localTimeHHMM(at('08:05'), 'Asia/Taipei')).toBe('08:05');
    expect(localTimeHHMM(at('00:30'), 'Asia/Taipei')).toBe('00:30');
  });

  it('時段邊界：含開始、不含結束', () => {
    expect(mealWindowState('breakfast', at('07:59'), 'Asia/Taipei')).toBe('before');
    expect(mealWindowState('breakfast', at('08:00'), 'Asia/Taipei')).toBe('open');
    expect(mealWindowState('breakfast', at('08:59'), 'Asia/Taipei')).toBe('open');
    expect(mealWindowState('breakfast', at('09:00'), 'Asia/Taipei')).toBe('after');
    expect(mealWindowState('lunch', at('11:29'), 'Asia/Taipei')).toBe('before');
    expect(mealWindowState('lunch', at('12:29'), 'Asia/Taipei')).toBe('open');
    expect(mealWindowState('dinner', at('18:30'), 'Asia/Taipei')).toBe('open');
  });

  it('目前開放的餐', () => {
    expect(openMeal(at('12:00'), 'Asia/Taipei')?.id).toBe('lunch');
    expect(openMeal(at('15:00'), 'Asia/Taipei')).toBe(null);
  });

  it('打卡後功課完成', () => {
    const d = day('2026-11-24', { meals: { lunch: '2026-11-24T04:00:00Z' } });
    const q = evaluateDailyQuests(d, GOAL);
    expect(q.find((x) => x.def.code === 'meal_lunch')!.completed).toBe(true);
    expect(q.find((x) => x.def.code === 'meal_dinner')!.completed).toBe(false);
  });
});
