// 以 Supabase REST（PostgREST）實作 SyncDb，使用 service role 權限（只在 Edge Function 內使用）。
import type { DailyHealthRow, SyncDb, WorkoutRow } from './sync.ts';

type FetchLike = typeof fetch;

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  // 新版金鑰（sb_secret_…）只放 apikey；舊版 JWT 金鑰兩個標頭都要
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json', ...extra };
  if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

async function check(res: Response, what: string): Promise<Response> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${what} 失敗（${res.status}）：${text.slice(0, 200)}`);
  }
  return res;
}

export function restDb(baseUrl: string, serviceKey: string, f: FetchLike = fetch): SyncDb {
  const rest = `${baseUrl.replace(/\/$/, '')}/rest/v1`;
  return {
    async findActiveToken(tokenHash) {
      const url = `${rest}/sync_tokens?select=user_id&token_hash=eq.${encodeURIComponent(tokenHash)}&revoked_at=is.null&limit=1`;
      const res = await check(await f(url, { headers: headers(serviceKey) }), '查詢金鑰');
      const rows = (await res.json()) as { user_id: string }[];
      return rows[0] ?? null;
    },
    async touchToken(tokenHash, at) {
      const url = `${rest}/sync_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}`;
      await check(
        await f(url, { method: 'PATCH', headers: headers(serviceKey, { Prefer: 'return=minimal' }), body: JSON.stringify({ last_used_at: at }) }),
        '更新金鑰使用時間',
      );
    },
    async upsertDailyHealth(row: DailyHealthRow) {
      const url = `${rest}/daily_health?on_conflict=user_id,date`;
      await check(
        await f(url, {
          method: 'POST',
          headers: headers(serviceKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify(row),
        }),
        '寫入每日健康資料',
      );
    },
    async replaceShortcutWorkouts(userId: string, day: string, rows: WorkoutRow[]) {
      const del = `${rest}/workouts?user_id=eq.${encodeURIComponent(userId)}&day=eq.${day}&source=eq.shortcut`;
      await check(await f(del, { method: 'DELETE', headers: headers(serviceKey, { Prefer: 'return=minimal' }) }), '清除舊的體能訓練');
      if (rows.length === 0) return;
      await check(
        await f(`${rest}/workouts?on_conflict=user_id,start_at,type`, {
          method: 'POST',
          headers: headers(serviceKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify(rows),
        }),
        '寫入體能訓練',
      );
    },
    async revokeTokens(userId, at) {
      const url = `${rest}/sync_tokens?user_id=eq.${encodeURIComponent(userId)}&revoked_at=is.null`;
      await check(
        await f(url, { method: 'PATCH', headers: headers(serviceKey, { Prefer: 'return=minimal' }), body: JSON.stringify({ revoked_at: at }) }),
        '撤銷舊金鑰',
      );
    },
    async insertToken(userId, tokenHash, at) {
      await check(
        await f(`${rest}/sync_tokens`, {
          method: 'POST',
          headers: headers(serviceKey, { Prefer: 'return=minimal' }),
          body: JSON.stringify({ user_id: userId, token_hash: tokenHash, created_at: at }),
        }),
        '建立金鑰',
      );
    },
  };
}

/** 由使用者的登入憑證（JWT）取得 user id */
export async function getUserId(baseUrl: string, anonOrServiceKey: string, authHeader: string | null, f: FetchLike = fetch): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const res = await f(`${baseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: anonOrServiceKey, Authorization: authHeader },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}
