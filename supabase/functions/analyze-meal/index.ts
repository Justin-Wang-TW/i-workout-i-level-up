// 餐點照片 AI 估算。需要在 Supabase › Edge Functions › Secrets 設定 ANTHROPIC_API_KEY。
import { getUserId } from '../_shared/rest.ts';
import { handleAnalyzeMeal, startOfTaipeiDay } from '../_shared/meal.ts';
import { json } from '../_shared/sync.ts';

const url = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? key;
const aiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-5-5';

function dbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json', ...extra };
  if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

Deno.serve(async (req) => {
  try {
    return await handleAnalyzeMeal(req, {
      hasKey: aiKey.length > 0,
      userId: (auth) => getUserId(url, anon, auth),
      usedToday: async (userId) => {
        const res = await fetch(
          `${url}/rest/v1/meal_analyses?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(startOfTaipeiDay())}`,
          { headers: dbHeaders() },
        );
        if (!res.ok) return 0;
        return ((await res.json()) as unknown[]).length;
      },
      record: async (userId) => {
        await fetch(`${url}/rest/v1/meal_analyses`, {
          method: 'POST',
          headers: dbHeaders({ Prefer: 'return=minimal' }),
          body: JSON.stringify({ user_id: userId }),
        });
      },
      vision: async (image, mediaType, prompt, system) => {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': aiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            max_tokens: 900,
            system,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
                  { type: 'text', text: prompt },
                ],
              },
            ],
          }),
        });
        if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        return (data.content ?? []).map((c) => c.text ?? '').join('');
      },
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, code: 'error', error: 'AI 辨識暫時失敗，請稍後再試' }, 500);
  }
});
