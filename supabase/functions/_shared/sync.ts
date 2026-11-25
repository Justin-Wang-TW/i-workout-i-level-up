// 捷徑同步的核心邏輯：不依賴 Deno，可在 Node 單元測試。
// 對應需求書 3.6。

export type WorkoutType = 'walking' | 'running' | 'other';

export interface DailyHealthRow {
  user_id: string;
  date: string;
  steps: number;
  walk_run_km: number;
  exercise_min: number;
  source: 'shortcut';
  received_at: string;
}

export interface WorkoutRow {
  user_id: string;
  day: string;
  start_at: string;
  type: WorkoutType;
  duration_min: number;
  distance_km: number;
  manual: boolean;
  source: 'shortcut';
}

/** 資料庫操作介面：正式環境用 Supabase REST，測試時用記憶體 */
export interface SyncDb {
  findActiveToken(tokenHash: string): Promise<{ user_id: string } | null>;
  touchToken(tokenHash: string, at: string): Promise<void>;
  upsertDailyHealth(row: DailyHealthRow): Promise<void>;
  replaceShortcutWorkouts(userId: string, day: string, rows: WorkoutRow[]): Promise<void>;
  revokeTokens(userId: string, at: string): Promise<void>;
  insertToken(userId: string, tokenHash: string, at: string): Promise<void>;
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newSyncToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `iwlu_${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

// ───────── 解析捷徑送來的資料 ─────────

/** 捷徑的數字有時是字串，例如 "8,423" 或 "5.2 公里" */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').replace(/[^\d.\-]/g, ' ').trim().split(/\s+/)[0] ?? '';
    return cleaned === '' ? NaN : Number(cleaned);
  }
  return NaN;
}

export function dayKeyIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/** 捷徑的日期可能是 2026-11-24、2026/11/24 或含時間的字串 */
function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  const key = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return isValidDayKey(key) ? key : null;
}

export function classifyWorkout(raw: unknown): WorkoutType {
  const t = String(raw ?? '').toLowerCase();
  if (/run|跑/.test(t)) return 'running';
  if (/walk|hik|步行|健走|散步|走路|健行|登山/.test(t)) return 'walking';
  return 'other';
}

export interface ParsedSync {
  date: string;
  steps: number;
  walkRunKm: number;
  exerciseMin: number;
  workouts: { type: WorkoutType; start: string; durationMin: number; distanceKm: number; manual: boolean }[];
}

export function parseSyncPayload(
  body: unknown,
  now: Date,
  timeZone = 'Asia/Taipei',
): { ok: true; data: ParsedSync } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: '內容不是 JSON 物件' };
  const b = body as Record<string, unknown>;
  const today = dayKeyIn(now, timeZone);
  const date = b.date === undefined || b.date === '' ? today : normalizeDate(b.date);
  if (!date) return { ok: false, error: '日期格式錯誤，請用 yyyy-MM-dd' };
  if (date > addDays(today, 1)) return { ok: false, error: '不接受未來的日期' };
  if (date < addDays(today, -7)) return { ok: false, error: '只接受 7 天內的資料' };

  // 捷徑在「健康」沒有資料時會送出空值（例如沒戴 Apple Watch 就沒有運動分鐘數），一律當作 0
  const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  const shown = (v: unknown) => String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 20);
  const steps = blank(b.steps) ? 0 : Math.round(toNumber(b.steps));
  if (!Number.isFinite(steps) || steps < 0 || steps > 100_000) return { ok: false, error: `步數不合理（收到：${shown(b.steps)}）` };

  let km = blank(b.walkRunKm) ? 0 : toNumber(b.walkRunKm);
  if (Number.isFinite(km) && km > 300) km = km / 1000; // 捷徑若送出公尺，換算成公里
  if (!Number.isFinite(km) || km < 0 || km > 300) return { ok: false, error: `距離不合理（收到：${shown(b.walkRunKm)}）` };

  const exerciseMin = blank(b.exerciseMin) ? 0 : Math.round(toNumber(b.exerciseMin));
  if (!Number.isFinite(exerciseMin) || exerciseMin < 0 || exerciseMin > 1440) {
    return { ok: false, error: `運動時間不合理（收到：${shown(b.exerciseMin)}）` };
  }

  const workouts: ParsedSync['workouts'] = [];
  if (Array.isArray(b.workouts)) {
    for (const w of b.workouts.slice(0, 30)) {
      if (!w || typeof w !== 'object') continue;
      const r = w as Record<string, unknown>;
      const durationMin = Math.round(toNumber(r.durationMin));
      let distanceKm = r.distanceKm === undefined ? 0 : toNumber(r.distanceKm);
      if (distanceKm > 300) distanceKm /= 1000;
      if (!Number.isFinite(durationMin) || durationMin < 0 || durationMin > 600) continue;
      if (!Number.isFinite(distanceKm) || distanceKm < 0) distanceKm = 0;
      const startRaw = typeof r.start === 'string' ? new Date(r.start) : null;
      const start = startRaw && !Number.isNaN(startRaw.getTime()) ? startRaw.toISOString() : `${date}T${String(workouts.length).padStart(2, '0')}:00:00.000Z`;
      workouts.push({
        type: classifyWorkout(r.type),
        start,
        durationMin,
        distanceKm: Math.round(distanceKm * 100) / 100,
        manual: r.manual === true || r.manual === 'true' || r.manual === 1,
      });
    }
  }

  // 簡易版捷徑只送當日加總：以一筆「當日運動」代表
  if (workouts.length === 0 && exerciseMin > 0) {
    workouts.push({
      type: km > 0 ? 'walking' : 'other',
      start: `${date}T00:00:00.000Z`,
      durationMin: Math.min(600, exerciseMin),
      distanceKm: Math.round(km * 100) / 100,
      manual: false,
    });
  }

  return { ok: true, data: { date, steps, walkRunKm: Math.round(km * 100) / 100, exerciseMin, workouts } };
}

export function syncMessage(d: ParsedSync): string {
  const [, m, day] = d.date.split('-');
  const parts = [`${Number(m)}/${Number(day)} 已同步`, `${d.steps.toLocaleString('en-US')} 步`];
  const longest = d.workouts.reduce((a, w) => Math.max(a, w.durationMin), 0);
  if (longest > 0) parts.push(`運動 ${longest} 分`);
  if (d.walkRunKm > 0) parts.push(`${d.walkRunKm} 公里`);
  const sweat =
    d.steps >= 8000 ||
    longest >= 30 ||
    d.workouts.some((w) => w.type !== 'other' && w.distanceKm >= 5);
  return `${parts.join('・')}。${sweat ? '已達揮汗門檻，' : ''}打開遊戲領取修為！`;
}

// ───────── 函式處理 ─────────

export async function handleSync(req: Request, db: SyncDb, now = new Date()): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: '請用 POST' }, 405);

  const token = (req.headers.get('x-sync-token') ?? '').trim();
  if (!token) return json({ ok: false, error: '缺少同步金鑰（x-sync-token）', message: '同步失敗：缺少同步金鑰' }, 401);
  const hash = await sha256Hex(token);
  const owner = await db.findActiveToken(hash);
  if (!owner) {
    return json({ ok: false, error: '同步金鑰無效或已撤銷', message: '同步失敗：金鑰無效，請到遊戲設定重新產生' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: '內容不是 JSON', message: '同步失敗：內容格式錯誤' }, 400);
  }
  const tz = typeof (body as Record<string, unknown>)?.timeZone === 'string' ? String((body as Record<string, unknown>).timeZone) : 'Asia/Taipei';
  let parsed: ReturnType<typeof parseSyncPayload>;
  try {
    parsed = parseSyncPayload(body, now, tz);
  } catch {
    parsed = parseSyncPayload(body, now);
  }
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: `同步失敗：${parsed.error}` }, 422);
  const d = parsed.data;
  const at = now.toISOString();

  await db.upsertDailyHealth({
    user_id: owner.user_id,
    date: d.date,
    steps: d.steps,
    walk_run_km: d.walkRunKm,
    exercise_min: d.exerciseMin,
    source: 'shortcut',
    received_at: at,
  });
  await db.replaceShortcutWorkouts(
    owner.user_id,
    d.date,
    d.workouts.map((w) => ({
      user_id: owner.user_id,
      day: d.date,
      start_at: w.start,
      type: w.type,
      duration_min: w.durationMin,
      distance_km: w.distanceKm,
      manual: w.manual,
      source: 'shortcut',
    })),
  );
  await db.touchToken(hash, at);

  return json({ ok: true, date: d.date, steps: d.steps, workouts: d.workouts.length, message: syncMessage(d) });
}

/** 產生新的同步金鑰（舊金鑰會被撤銷）。userId 由呼叫端驗證登入後提供 */
export async function handleCreateToken(userId: string | null, db: SyncDb, now = new Date()): Promise<Response> {
  if (!userId) return json({ ok: false, error: '請先登入' }, 401);
  const token = newSyncToken();
  const at = now.toISOString();
  await db.revokeTokens(userId, at);
  await db.insertToken(userId, await sha256Hex(token), at);
  return json({ ok: true, token });
}
