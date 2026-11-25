// 餐點照片 → AI 估算熱量與營養素。照片只在這次請求中使用，不會儲存。
import { CORS_HEADERS, json } from './sync.ts';

export const DAILY_LIMIT = 20;
/** base64 長度上限（約 2 MB 圖片） */
export const MAX_IMAGE_CHARS = 2_800_000;

export interface MealDeps {
  /** 驗證登入者，回傳 user id */
  userId: (authHeader: string | null) => Promise<string | null>;
  /** 今天（台灣時間）已用幾次 */
  usedToday: (userId: string) => Promise<number>;
  record: (userId: string) => Promise<void>;
  /** 呼叫視覺模型，回傳模型輸出的文字 */
  vision: (imageBase64: string, mediaType: string, prompt: string, system: string) => Promise<string>;
  hasKey: boolean;
}

export const SYSTEM_PROMPT = `你是台灣的營養師助理，根據照片估算餐點的熱量與營養素。
只輸出一個 JSON 物件，不要任何其他文字。數值用數字，不要單位。
欄位：
- name：餐點名稱（繁體中文，最多 20 字）
- items：陣列，每項 { "name": 食物, "portion": 估計份量，例如「1 碗約 200 克」 }
- kcal：總熱量（大卡）
- carbsG：醣類（碳水化合物）公克
- proteinG：蛋白質公克
- fatG：脂質（脂肪）公克
- vitamins：維生素的主要來源，一句話，例如「青菜提供維生素 A、C」
- minerals：礦物質的主要來源，一句話，例如「豆干提供鈣、瘦肉提供鐵」
- note：估算時的假設或不確定處，一句話
- confidence：0 到 1，對整體估算的信心
份量依台灣常見便當、小吃與超商食品的一般份量估計。看不清楚時寧可保守並在 note 說明。
如果照片裡不是食物或營養標示，輸出 {"error":"not_food"}。`;

export function userPrompt(mode: 'photo' | 'label', hint: string): string {
  const extra = hint ? `\n使用者補充：${hint}` : '';
  if (mode === 'label') {
    return `這是包裝食品的「營養標示」。請讀出「每一份」的熱量、蛋白質、脂肪、碳水化合物（醣類），填入 kcal、proteinG、fatG、carbsG，並額外輸出 servingsPerPackage（本包裝含幾份，讀不到就填 1）。
若標示只有每 100 公克，請依淨重換算成整包當作一份，servingsPerPackage 填 1。
name 填產品名稱（看得到的話），items 可留空陣列；vitamins、minerals 依標示上有列出的項目（例如鈉、鈣）簡述。${extra}`;
  }
  return `請辨識照片中的餐點並估算營養。${extra}`;
}

/** 從模型輸出中取出 JSON 物件 */
export function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function handleAnalyzeMeal(req: Request, deps: MealDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, code: 'error', error: '請用 POST' }, 405);
  if (!deps.hasKey) return json({ ok: false, code: 'no_ai', error: '雲端尚未設定 AI 金鑰（ANTHROPIC_API_KEY）' }, 503);

  const userId = await deps.userId(req.headers.get('Authorization'));
  if (!userId) return json({ ok: false, code: 'error', error: '請先登入' }, 401);

  let body: { image?: unknown; mediaType?: unknown; mode?: unknown; hint?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 'bad_image', error: '內容格式錯誤' }, 400);
  }
  const image = typeof body.image === 'string' ? body.image : '';
  const mediaType = body.mediaType === 'image/png' || body.mediaType === 'image/webp' ? body.mediaType : 'image/jpeg';
  const mode = body.mode === 'label' ? 'label' : 'photo';
  const hint = typeof body.hint === 'string' ? body.hint.slice(0, 200) : '';
  if (!image || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200))) {
    return json({ ok: false, code: 'bad_image', error: '照片太大或格式不支援' }, 400);
  }

  const used = await deps.usedToday(userId);
  if (used >= DAILY_LIMIT) return json({ ok: false, code: 'limit', error: `今日 AI 估算已達 ${DAILY_LIMIT} 次`, remaining: 0 }, 429);

  const text = await deps.vision(image, mediaType, userPrompt(mode, hint), SYSTEM_PROMPT);
  await deps.record(userId);
  const parsed = extractJson(text);
  if (!parsed) return json({ ok: false, code: 'error', error: '無法解讀辨識結果，請再試一次' }, 502);
  if (parsed.error === 'not_food') return json({ ok: false, code: 'bad_image', error: '照片中看不出食物或營養標示' }, 422);
  const servings = Number(parsed.servingsPerPackage);
  return json({
    ok: true,
    estimate: parsed,
    servingsPerPackage: Number.isFinite(servings) && servings > 0 ? servings : undefined,
    remaining: DAILY_LIMIT - used - 1,
  });
}

/** 台灣時間今天 00:00 的 ISO 字串 */
export function startOfTaipeiDay(now = new Date()): string {
  const t = new Date(now.getTime() + 8 * 3_600_000);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 8 * 3_600_000).toISOString();
}
