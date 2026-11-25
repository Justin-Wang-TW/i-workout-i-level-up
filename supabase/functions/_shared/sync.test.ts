import { describe, expect, it } from 'vitest';
import {
  classifyWorkout,
  handleCreateToken,
  handleSync,
  parseSyncPayload,
  sha256Hex,
  toNumber,
  type DailyHealthRow,
  type SyncDb,
  type WorkoutRow,
} from './sync.ts';

// 台北 2026-11-24 23:30
const NOW = new Date('2026-11-24T15:30:00Z');

function memoryDb() {
  const tokens: { user_id: string; token_hash: string; revoked_at: string | null; last_used_at?: string }[] = [];
  const health = new Map<string, DailyHealthRow>();
  let workouts: WorkoutRow[] = [];
  const db: SyncDb = {
    async findActiveToken(h) {
      const t = tokens.find((x) => x.token_hash === h && !x.revoked_at);
      return t ? { user_id: t.user_id } : null;
    },
    async touchToken(h, at) {
      const t = tokens.find((x) => x.token_hash === h);
      if (t) t.last_used_at = at;
    },
    async upsertDailyHealth(row) {
      health.set(`${row.user_id}|${row.date}`, row);
    },
    async replaceShortcutWorkouts(userId, day, rows) {
      workouts = workouts.filter((w) => !(w.user_id === userId && w.day === day && w.source === 'shortcut')).concat(rows);
    },
    async revokeTokens(userId, at) {
      for (const t of tokens) if (t.user_id === userId && !t.revoked_at) t.revoked_at = at;
    },
    async insertToken(userId, h) {
      tokens.push({ user_id: userId, token_hash: h, revoked_at: null });
    },
  };
  return { db, tokens, health, get workouts() { return workouts; } };
}

function post(body: unknown, token?: string): Request {
  return new Request('https://x.supabase.co/functions/v1/sync-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-sync-token': token } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function makeToken(m: ReturnType<typeof memoryDb>, user = 'u1'): Promise<string> {
  const res = await handleCreateToken(user, m.db, NOW);
  const j = (await res.json()) as { token: string };
  return j.token;
}

describe('解析捷徑資料', () => {
  it('數字字串、千分位、單位都能解析', () => {
    expect(toNumber('8,423')).toBe(8423);
    expect(toNumber('5.2 公里')).toBe(5.2);
    expect(toNumber(12)).toBe(12);
    expect(Number.isNaN(toNumber('abc'))).toBe(true);
  });

  it('運動類型分類', () => {
    expect(classifyWorkout('Outdoor Run')).toBe('running');
    expect(classifyWorkout('戶外步行')).toBe('walking');
    expect(classifyWorkout('瑜伽')).toBe('other');
  });

  it('日期格式與範圍', () => {
    expect(parseSyncPayload({ date: '2026/11/24', steps: 1 }, NOW).ok).toBe(true);
    expect(parseSyncPayload({ date: '2026-11-26', steps: 1 }, NOW).ok).toBe(false);
    expect(parseSyncPayload({ date: '2026-11-10', steps: 1 }, NOW).ok).toBe(false);
    const noDate = parseSyncPayload({ steps: 1 }, NOW);
    expect(noDate.ok && noDate.data.date).toBe('2026-11-24');
  });

  it('不合理數值拒收', () => {
    expect(parseSyncPayload({ steps: 200000 }, NOW).ok).toBe(false);
    expect(parseSyncPayload({ steps: -5 }, NOW).ok).toBe(false);
  });

  it('健康沒有資料時送來的空值當作 0（例如沒戴 Apple Watch）', () => {
    const r = parseSyncPayload({ steps: '6,512', walkRunKm: '4.3', exerciseMin: '' }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.steps).toBe(6512);
      expect(r.data.exerciseMin).toBe(0);
    }
    expect(parseSyncPayload({ steps: null, walkRunKm: ' ', exerciseMin: null }, NOW).ok).toBe(true);
  });

  it('錯誤訊息附上收到的值，方便檢查欄位是否對錯', () => {
    const r = parseSyncPayload({ steps: 1, exerciseMin: 8321 }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.includes('8321')).toBe(true);
  });

  it('距離若是公尺會換算成公里', () => {
    const r = parseSyncPayload({ steps: 1, walkRunKm: 5200 }, NOW);
    expect(r.ok && r.data.walkRunKm).toBe(5.2);
  });

  it('簡易版只送運動分鐘時，產生一筆當日運動', () => {
    const r = parseSyncPayload({ steps: 9000, walkRunKm: 6.1, exerciseMin: 42 }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.workouts.length).toBe(1);
      expect(r.data.workouts[0].durationMin).toBe(42);
      expect(r.data.workouts[0].type).toBe('walking');
    }
  });
});

describe('sync-health', () => {
  it('沒有金鑰或金鑰錯誤 → 401', async () => {
    const m = memoryDb();
    expect((await handleSync(post({ steps: 1 }), m.db, NOW)).status).toBe(401);
    expect((await handleSync(post({ steps: 1 }, 'iwlu_wrong'), m.db, NOW)).status).toBe(401);
  });

  it('正確金鑰寫入資料，並回傳給捷徑顯示的訊息', async () => {
    const m = memoryDb();
    const token = await makeToken(m);
    const res = await handleSync(post({ date: '2026-11-24', steps: '8,423', walkRunKm: 5.2, exerciseMin: 34 }, token), m.db, NOW);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { message: string };
    expect(j.message.includes('8,423 步')).toBe(true);
    expect(j.message.includes('已達揮汗門檻')).toBe(true);
    expect(m.health.get('u1|2026-11-24')?.steps).toBe(8423);
    expect(m.workouts.length).toBe(1);
  });

  it('同一天重送會覆寫，不會重複', async () => {
    const m = memoryDb();
    const token = await makeToken(m);
    await handleSync(post({ steps: 5000, exerciseMin: 20 }, token), m.db, NOW);
    await handleSync(post({ steps: 9000, exerciseMin: 35 }, token), m.db, NOW);
    expect(m.health.get('u1|2026-11-24')?.steps).toBe(9000);
    expect(m.workouts.length).toBe(1);
    expect(m.workouts[0].duration_min).toBe(35);
  });

  it('重新產生金鑰後，舊金鑰失效', async () => {
    const m = memoryDb();
    const oldToken = await makeToken(m);
    const newToken = await makeToken(m);
    expect((await handleSync(post({ steps: 1 }, oldToken), m.db, NOW)).status).toBe(401);
    expect((await handleSync(post({ steps: 1 }, newToken), m.db, NOW)).status).toBe(200);
  });

  it('金鑰只存雜湊值', async () => {
    const m = memoryDb();
    const token = await makeToken(m);
    expect(m.tokens[0].token_hash).toBe(await sha256Hex(token));
    expect(token.startsWith('iwlu_')).toBe(true);
  });

  it('內容不是 JSON → 400', async () => {
    const m = memoryDb();
    const token = await makeToken(m);
    expect((await handleSync(post('not json', token), m.db, NOW)).status).toBe(400);
  });
});
