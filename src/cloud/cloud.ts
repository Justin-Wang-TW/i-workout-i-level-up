// 與 Supabase 溝通的精簡用戶端（不需額外套件）。
// 網址與公開金鑰在建置時由環境變數帶入：VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY。

// 未設定時使用正式專案（anon 為公開金鑰，受 RLS 保護，可放在前端）。
const DEFAULT_URL = 'https://mkpiijqcwfjazdxxqbti.supabase.co';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rcGlpanFjd2ZqYXpkeHhxYnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1NjQ0MjMsImV4cCI6MjExMTE0MDQyM30.3GZRSQ656G2of03KhRLRrV4Vf91oq0Ow6RQQaepHzaM';
const URL_ = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL).replace(/\/$/, '');
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;
const SESSION_KEY = 'iwlu-cloud-session';

export const SHORTCUT_NAME = '我運動我升級同步';

/** 捷徑的 iCloud 分享連結（建立並分享捷徑後填入；空字串＝尚未提供） */
export const SHORTCUT_INSTALL_URL = '';

/** 把同步金鑰交給捷徑保存（捷徑收到 iwlu_ 開頭的文字會存成檔案） */
export function shortcutLinkUrl(token: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(token)}`;
}

/** 建議的捷徑自動化時間（每天 4 次） */
export const SYNC_TIMES = ['12:00', '18:00', '22:00', '23:50'];

export function isCloudConfigured(): boolean {
  return (URL_.startsWith('https://') || URL_.startsWith('http://localhost')) && KEY.length > 20;
}

export function syncEndpoint(): string {
  return `${URL_}/functions/v1/sync-health`;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // 秒
  user_id: string;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 忽略 */
  }
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string };
  msg?: string;
  error_description?: string;
  message?: string;
}

function toSession(r: AuthResponse): Session {
  if (!r.access_token || !r.refresh_token || !r.user?.id) {
    throw new Error(r.msg || r.error_description || r.message || '登入失敗');
  }
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600),
    user_id: r.user.id,
  };
}

async function authPost(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as AuthResponse;
  if (!res.ok) {
    const text = data.msg || data.error_description || data.message || `HTTP ${res.status}`;
    if (/anonymous/i.test(text)) throw new Error('雲端尚未開啟「匿名登入」（Supabase › Authentication › Sign In / Providers › Allow anonymous sign-ins）');
    throw new Error(text);
  }
  return data;
}

/** 取得有效的登入狀態：沒有就匿名註冊，快過期就換發 */
export async function ensureSession(): Promise<Session> {
  const now = Math.floor(Date.now() / 1000);
  const s = loadSession();
  if (s && s.expires_at - 60 > now) return s;
  if (s) {
    try {
      const refreshed = toSession(await authPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token }));
      saveSession(refreshed);
      return refreshed;
    } catch {
      // 換發失敗（例如很久沒用）→ 重新匿名登入；需重新產生同步金鑰
      saveSession(null);
      throw new Error('登入已失效，請重新產生同步金鑰並更新捷徑');
    }
  }
  const created = toSession(await authPost('signup', { data: {} }));
  saveSession(created);
  return created;
}

export function hasSession(): boolean {
  return loadSession() !== null;
}

export function resetSession(): void {
  saveSession(null);
}

async function authed(path: string, init: RequestInit = {}): Promise<Response> {
  const s = await ensureSession();
  return fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

/** 產生新的同步金鑰（舊的會失效）。金鑰只會顯示這一次 */
export async function createSyncToken(): Promise<string> {
  const res = await authed('/functions/v1/create-sync-token', { method: 'POST', body: '{}' });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; error?: string };
  if (!res.ok || !data.token) throw new Error(data.error || `產生金鑰失敗（HTTP ${res.status}）`);
  return data.token;
}

export interface CloudDailyRow {
  date: string;
  steps: number;
  walk_run_km: number;
  exercise_min: number;
  received_at: string;
}

export interface CloudWorkoutRow {
  day: string;
  start_at: string;
  type: 'walking' | 'running' | 'other';
  duration_min: number;
  distance_km: number;
  manual: boolean;
}

/** 讀取某日之後的同步資料（Row Level Security 保證只拿到自己的） */
export async function fetchHealth(fromDay: string): Promise<{ daily: CloudDailyRow[]; workouts: CloudWorkoutRow[] }> {
  const [d, w] = await Promise.all([
    authed(`/rest/v1/daily_health?select=date,steps,walk_run_km,exercise_min,received_at&date=gte.${fromDay}&order=date.asc`),
    authed(`/rest/v1/workouts?select=day,start_at,type,duration_min,distance_km,manual&day=gte.${fromDay}&order=start_at.asc`),
  ]);
  if (!d.ok || !w.ok) throw new Error(`讀取同步資料失敗（HTTP ${d.ok ? w.status : d.status}）`);
  return { daily: (await d.json()) as CloudDailyRow[], workouts: (await w.json()) as CloudWorkoutRow[] };
}

export type MealPhotoMode = 'photo' | 'label';

export interface MealAnalysis {
  ok: boolean;
  /** AI 估算結果（ok 時才有） */
  estimate?: unknown;
  /** 營養標示：每包裝份數 */
  servingsPerPackage?: number;
  /** no_ai = 雲端尚未設定 AI 金鑰；limit = 今日次數已用完 */
  code?: 'no_ai' | 'limit' | 'bad_image' | 'error';
  error?: string;
  remaining?: number;
}

/** 把照片送到雲端由 AI 估算熱量與營養素（照片不會被儲存） */
export async function analyzeMeal(imageBase64: string, mediaType: string, mode: MealPhotoMode, hint: string): Promise<MealAnalysis> {
  if (!isCloudConfigured()) return { ok: false, code: 'no_ai', error: '雲端尚未設定' };
  const res = await authed('/functions/v1/analyze-meal', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, mediaType, mode, hint: hint.slice(0, 200) }),
  });
  const data = (await res.json().catch(() => ({}))) as MealAnalysis;
  if (res.status === 404) return { ok: false, code: 'no_ai', error: 'AI 辨識功能尚未啟用' };
  if (!res.ok || !data.ok) return { ok: false, code: data.code ?? 'error', error: data.error || `辨識失敗（HTTP ${res.status}）` };
  return data;
}
