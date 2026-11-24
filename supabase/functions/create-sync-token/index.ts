// 網頁「產生同步金鑰」按鈕呼叫：需要使用者登入（匿名登入亦可）
import { getUserId, restDb } from '../_shared/rest.ts';
import { CORS_HEADERS, handleCreateToken, json } from '../_shared/sync.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? key;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: '請用 POST' }, 405);
  try {
    const userId = await getUserId(url, anon, req.headers.get('Authorization'));
    return await handleCreateToken(userId, restDb(url, key));
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: '伺服器錯誤' }, 500);
  }
});
