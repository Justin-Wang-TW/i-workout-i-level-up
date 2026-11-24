import { describe, expect, it } from 'vitest';
import {
  addCup,
  addManualWorkout,
  applyCloudHealth,
  applyRestTicket,
  claimDaily,
  claimWeekly,
  completeBodyweight,
  createPlayer,
  deleteTrack,
  importGpxTrack,
  logMeal,
  saveTrack,
  restTicketsLeft,
  setManualSteps,
  streakOn,
  totalXp,
  undoLastCup,
  xpEarnedOn,
} from './game.ts';
import { EMPTY_SAVE, type SaveData } from './types.ts';

const DAY = '2026-11-23';

function fresh(): SaveData {
  return createPlayer(
    { ...EMPTY_SAVE, days: {}, ledger: [] },
    {
      name: '測試',
      avatar: 'sword',
      createdAt: '2026-11-23T00:00:00Z',
      weightKg: null,
      waterGoalMl: 2000,
      cupMl: 250,
      difficulty: 'beginner',
      timeZone: 'Asia/Taipei',
      safetyAcknowledged: true,
    },
  );
}

describe('喝水', () => {
  it('每杯 +5 XP，每日最多 40', () => {
    let s = fresh();
    for (let i = 0; i < 10; i += 1) s = addCup(s, DAY, 250);
    expect(totalXp(s)).toBe(40);
  });

  it('復原會一併收回 XP', () => {
    let s = addCup(fresh(), DAY, 250);
    s = undoLastCup(s, DAY);
    expect(totalXp(s)).toBe(0);
    expect(s.days[DAY].cups.length).toBe(0);
  });
});

describe('領取任務', () => {
  it('未完成不能領，完成後只能領一次', () => {
    let s = fresh();
    expect(claimDaily(s, DAY, 'bodyweight').granted).toBe(0);
    s = completeBodyweight(s, DAY);
    const first = claimDaily(s, DAY, 'bodyweight');
    expect(first.granted).toBe(40);
    const second = claimDaily(first.save, DAY, 'bodyweight');
    expect(second.granted).toBe(0);
    expect(totalXp(second.save)).toBe(40);
  });

  it('手動輸入步數 XP 減半', () => {
    let s = setManualSteps(fresh(), DAY, 9000);
    s = claimDaily(s, DAY, 'steps_8000').save;
    expect(totalXp(s)).toBe(20);
  });

  it('沒有每日上限：當天已拿很多修為，功課仍照領', () => {
    let s = fresh();
    s = {
      ...s,
      ledger: [
        { id: 'x', day: DAY, kind: 'daily', ref: 'x@1', reason: '測試', amount: 500, multiplier: 1, attribute: null, at: '' },
      ],
    };
    s = completeBodyweight(s, DAY);
    const r = claimDaily(s, DAY, 'bodyweight');
    expect(r.granted).toBe(40);
    expect(xpEarnedOn(r.save, DAY)).toBe(540);
    // 喝水仍有每日 40 的杯數上限
    let c = r.save;
    for (let i = 0; i < 10; i += 1) c = addCup(c, DAY, 250);
    expect(xpEarnedOn(c, DAY)).toBe(580);
  });
});

describe('休息日券', () => {
  it('每週 1 張，使用後算進連續天數', () => {
    let s = fresh();
    expect(restTicketsLeft(s, DAY)).toBe(1);
    s = applyRestTicket(s, DAY);
    expect(restTicketsLeft(s, DAY)).toBe(0);
    expect(streakOn(s, DAY)).toBe(1);
    const again = applyRestTicket(s, '2026-11-24');
    expect(again.days['2026-11-24']).toBeUndefined();
  });
});

describe('捷徑同步合併', () => {
  const daily = [{ date: DAY, steps: 9100, walk_run_km: 6.2, exercise_min: 40, received_at: '2026-11-23T15:30:00Z' }];
  const workouts = [
    { day: DAY, start_at: '2026-11-23T11:00:00Z', type: 'running' as const, duration_min: 35, distance_km: 5.3, manual: false },
  ];

  it('步數以捷徑為準，修為不減半', () => {
    let s = setManualSteps(fresh(), DAY, 3000);
    s = applyCloudHealth(s, daily, workouts);
    expect(s.days[DAY].steps).toBe(9100);
    expect(s.days[DAY].stepsSource).toBe('shortcut');
    s = claimDaily(s, DAY, 'steps_8000').save;
    expect(totalXp(s)).toBe(40);
  });

  it('重複同步不會重複加入運動，手動紀錄保留', () => {
    let s = addManualWorkout(fresh(), DAY, { type: 'other', durationMin: 10, distanceKm: 0 });
    s = applyCloudHealth(s, daily, workouts);
    s = applyCloudHealth(s, daily, workouts);
    expect(s.days[DAY].workouts.length).toBe(2);
    expect(s.days[DAY].workouts.filter((w) => w.synced).length).toBe(1);
    expect(s.cloud?.lastReceivedAt).toBe('2026-11-23T15:30:00Z');
  });

  it('在健康 App 手動輸入的運動視為手動', () => {
    const s = applyCloudHealth(fresh(), [], [{ ...workouts[0], manual: true }]);
    const r = claimDaily(s, DAY, 'exercise_30');
    expect(r.granted).toBe(25);
  });
});

describe('用膳打卡', () => {
  const at = (hhmm: string) => new Date(`2026-11-23T${hhmm}:00+08:00`);
  it('時段外按了也不算', () => {
    const s = logMeal(fresh(), DAY, 'breakfast', at('09:30'));
    expect(s.days[DAY]).toBeUndefined();
  });
  it('時段內打卡，可領 10 修為，不會重複打卡', () => {
    let s = logMeal(fresh(), DAY, 'breakfast', at('08:20'));
    const again = logMeal(s, DAY, 'breakfast', at('08:40'));
    expect(again).toBe(s);
    s = claimDaily(s, DAY, 'meal_breakfast').save;
    expect(totalXp(s)).toBe(10);
  });
});

describe('GPS 行功', () => {
  const track = {
    id: 't1',
    day: DAY,
    type: 'walking' as const,
    start: '2026-11-23T11:00:00Z',
    end: '2026-11-23T11:40:00Z',
    durationMin: 40,
    distanceKm: 5.1,
    points: [[25.03, 121.56, 0], [25.04, 121.57, 60]] as [number, number, number][],
  };
  it('存成運動紀錄，修為不減半', () => {
    let s = saveTrack(fresh(), track);
    expect(s.tracks?.length).toBe(1);
    const r = claimDaily(s, DAY, 'exercise_30');
    expect(r.granted).toBe(50);
    s = deleteTrack(s, 't1');
    expect(s.tracks?.length).toBe(0);
    expect(s.days[DAY].workouts.length).toBe(0);
  });
});

describe('匯入 GPX 路線', () => {
  const gpx = {
    name: '晨跑',
    start: '2026-11-23T22:30:00.000Z', // 台北 11/24 06:30
    end: '2026-11-23T23:05:00.000Z',
    movingSec: 34 * 60,
    distanceKm: 5.2,
    points: [[25.03, 121.56, 0], [25.05, 121.56, 2100]] as [number, number, number][],
  };
  it('依台北時間歸到 11/24，記為全額運動，重複匯入會被擋', () => {
    const r = importGpxTrack(fresh(), gpx, 'running', '2026-11-24');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.track.day).toBe('2026-11-24');
    expect(claimDaily(r.save, '2026-11-24', 'exercise_30').granted).toBe(50);
    const again = importGpxTrack(r.save, gpx, 'running', '2026-11-24');
    expect(again.ok).toBe(false);
  });
  it('未來日期不接受', () => {
    expect(importGpxTrack(fresh(), gpx, 'running', '2026-11-23').ok).toBe(false);
  });
});
