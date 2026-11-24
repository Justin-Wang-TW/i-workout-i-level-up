// iPhone 捷徑每天定時呼叫（建議 12:00、18:00、22:00、23:50）：POST，標頭 x-sync-token，本文 JSON（見需求書 3.6）
// 部署時需加 --no-verify-jwt（捷徑沒有登入憑證，改用同步金鑰驗證）
import { restDb } from '../_shared/rest.ts';
import { handleSync, json } from '../_shared/sync.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  try {
    return await handleSync(req, restDb(url, key));
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: '伺服器錯誤', message: '同步失敗：伺服器錯誤，請稍後再試' }, 500);
  }
});
