// 餐點紀錄：拍照或拍營養標示 → AI 估算熱量與五大營養素；也可手動輸入
import { useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  MEAL_SLOT_LABEL,
  macroShare,
  sanitizeEstimate,
  scaleNutrients,
  sumNutrients,
  type MealSlot,
  type NutritionEstimate,
} from '../../packages/game-core/index.ts';
import { analyzeMeal, isCloudConfigured, type MealPhotoMode } from '../cloud/cloud.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { FOOD_STONES_PER_DAY, addFood, foodOn, removeFood } from '../state/cultivation.ts';
import type { FoodEntry } from '../state/types.ts';

/** 依目前時間猜是哪一餐 */
function guessSlot(d = new Date()): MealSlot {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 300 && m < 630) return 'breakfast';
  if (m >= 630 && m < 900) return 'lunch';
  if (m >= 1020 && m < 1290) return 'dinner';
  return 'snack';
}

/** 縮小照片：長邊 max px，回傳 JPEG base64（不含前綴）與 data URL */
async function shrink(file: File, max: number, quality: number): Promise<{ base64: string; dataUrl: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('無法讀取這張照片'));
      el.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('瀏覽器不支援影像處理');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { base64: dataUrl.split(',')[1] ?? '', dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const EMPTY_FORM = { name: '', kcal: '', carbsG: '', proteinG: '', fatG: '', vitamins: '', minerals: '', note: '' };
type Form = typeof EMPTY_FORM;

function toForm(e: NutritionEstimate): Form {
  return {
    name: e.name,
    kcal: String(e.kcal),
    carbsG: String(e.carbsG),
    proteinG: String(e.proteinG),
    fatG: String(e.fatG),
    vitamins: e.vitamins,
    minerals: e.minerals,
    note: e.note,
  };
}

const n = (v: string) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.round(x * 10) / 10 : 0;
};

export function FoodSheet({ onClose }: { onClose: () => void }) {
  const { today, update, notify } = useGame();
  const [slot, setSlot] = useState<MealSlot>(guessSlot());
  const [mode, setMode] = useState<MealPhotoMode | 'manual'>('photo');
  const [photo, setPhoto] = useState<{ base64: string; preview: string; thumb: string } | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [items, setItems] = useState<NutritionEstimate['items']>([]);
  const [estimated, setEstimated] = useState(false);
  const [perServing, setPerServing] = useState<NutritionEstimate | null>(null);
  const [servings, setServings] = useState('1');
  const [confidence, setConfidence] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloud = isCloudConfigured();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const big = await shrink(file, 1024, 0.8);
      const small = await shrink(file, 160, 0.6);
      setPhoto({ base64: big.base64, preview: big.dataUrl, thumb: small.dataUrl });
      setEstimated(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const estimate = async () => {
    if (!photo || mode === 'manual') return;
    setBusy(true);
    setError('');
    try {
      const r = await analyzeMeal(photo.base64, 'image/jpeg', mode, hint);
      if (!r.ok) {
        if (r.code === 'no_ai') {
          setError('AI 估算尚未啟用（需要在雲端設定 AI 金鑰）。可以先手動輸入，照片會一起保存。');
          setMode('manual');
        } else if (r.code === 'limit') {
          setError('今日 AI 估算次數已用完，明天再試或先手動輸入。');
        } else {
          setError(r.error || '辨識失敗，請換一張清楚的照片');
        }
        return;
      }
      const est = sanitizeEstimate(r.estimate);
      setItems(est.items);
      setConfidence(est.confidence);
      if (mode === 'label') {
        setPerServing(est);
        setServings('1');
      }
      setForm(toForm(est));
      setEstimated(true);
    } catch (e) {
      setError((e as Error).message || '網路連線失敗');
    } finally {
      setBusy(false);
    }
  };

  const changeServings = (v: string) => {
    setServings(v);
    if (!perServing) return;
    const k = Number(v);
    if (!Number.isFinite(k) || k <= 0) return;
    const s = scaleNutrients(perServing, k);
    setForm((f) => ({ ...f, kcal: String(s.kcal), carbsG: String(s.carbsG), proteinG: String(s.proteinG), fatG: String(s.fatG) }));
  };

  const save = () => {
    const name = form.name.trim() || MEAL_SLOT_LABEL[slot];
    const source: FoodEntry['source'] = mode === 'manual' ? 'manual' : mode;
    update((s) =>
      addFood(
        s,
        today,
        slot,
        {
          name,
          items,
          kcal: n(form.kcal),
          carbsG: n(form.carbsG),
          proteinG: n(form.proteinG),
          fatG: n(form.fatG),
          vitamins: form.vitamins.trim(),
          minerals: form.minerals.trim(),
          note: form.note.trim(),
        },
        source,
        photo?.thumb,
      ),
    );
    notify(`【${MEAL_SLOT_LABEL[slot]}】已記錄`, `${name}・約 ${n(form.kcal)} 大卡`);
    onClose();
  };

  const canSave = mode === 'manual' ? !!(form.name || form.kcal) : estimated || !!form.kcal;
  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const numSet = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^\d.]/g, '') }));

  return createPortal(
    <div className="overlay workout" role="dialog" aria-modal="true" aria-label="記錄餐點">
      <div className="screen sheet">
        <header className="sheet-head">
          <h2>記錄餐點</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            關閉
          </button>
        </header>

        <div className="segmented">
          {(Object.keys(MEAL_SLOT_LABEL) as MealSlot[]).map((s) => (
            <button key={s} className={slot === s ? 'active' : ''} onClick={() => setSlot(s)}>
              {MEAL_SLOT_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="segmented">
          <button className={mode === 'photo' ? 'active' : ''} onClick={() => setMode('photo')}>
            拍餐點
            <small>AI 估算</small>
          </button>
          <button className={mode === 'label' ? 'active' : ''} onClick={() => setMode('label')}>
            拍營養標示
            <small>包裝食品</small>
          </button>
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
            手動輸入
            <small>自己填</small>
          </button>
        </div>

        <Panel>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          {photo ? (
            <img className="food-preview" src={photo.preview} alt="餐點照片" />
          ) : (
            <button className="food-drop" onClick={() => fileRef.current?.click()}>
              <span className="food-cam" aria-hidden="true">
                ◉
              </span>
              {mode === 'label' ? '拍下包裝背面的「營養標示」' : '拍下或選擇餐點照片'}
              <small className="muted">{mode === 'manual' ? '選填，只當作紀錄' : '照片只用來估算，不會存在雲端'}</small>
            </button>
          )}
          {photo && (
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              換一張
            </button>
          )}

          {mode !== 'manual' && (
            <>
              <label className="field">
                <span>補充說明（選填）</span>
                <input value={hint} maxLength={100} placeholder={mode === 'label' ? '例如：整包吃完' : '例如：飯只吃半碗、去皮'} onChange={(e) => setHint(e.target.value)} />
              </label>
              <button className="btn btn-primary btn-block" disabled={!photo || busy || !cloud} onClick={estimate}>
                {busy ? '靈識推演中…' : 'AI 估算熱量與營養素'}
              </button>
              {!cloud && <p className="hint">需要連上雲端才能使用 AI 估算。</p>}
            </>
          )}
          {error && <p className="error-text">{error}</p>}
        </Panel>

        {(mode === 'manual' || estimated) && (
          <Panel title={estimated ? 'AI 估算結果（可修改）' : '營養內容'}>
            {estimated && confidence !== null && (
              <p className="hint">
                估算信心：{confidence >= 0.75 ? '高' : confidence >= 0.45 ? '中' : '低'}。照片估算難免有誤差，份量不對時請直接修改數字。
              </p>
            )}
            {items.length > 0 && (
              <ul className="food-items">
                {items.map((it) => (
                  <li key={it.name + it.portion}>
                    {it.name}
                    <span className="muted"> {it.portion}</span>
                  </li>
                ))}
              </ul>
            )}
            {perServing && (
              <label className="field">
                <span>吃了幾份（營養標示的「每份」）</span>
                <input inputMode="decimal" value={servings} onChange={(e) => changeServings(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
            )}
            <label className="field">
              <span>餐點名稱</span>
              <input value={form.name} maxLength={40} placeholder="例如：雞腿便當" onChange={set('name')} />
            </label>
            <div className="form-row">
              <label className="field grow">
                <span>熱量（大卡）</span>
                <input inputMode="decimal" value={form.kcal} onChange={numSet('kcal')} />
              </label>
              <label className="field grow">
                <span>醣類（克）</span>
                <input inputMode="decimal" value={form.carbsG} onChange={numSet('carbsG')} />
              </label>
            </div>
            <div className="form-row">
              <label className="field grow">
                <span>蛋白質（克）</span>
                <input inputMode="decimal" value={form.proteinG} onChange={numSet('proteinG')} />
              </label>
              <label className="field grow">
                <span>脂質（克）</span>
                <input inputMode="decimal" value={form.fatG} onChange={numSet('fatG')} />
              </label>
            </div>
            <label className="field">
              <span>維生素（主要來源）</span>
              <input value={form.vitamins} maxLength={120} placeholder="例如：青菜的維生素 A、C" onChange={set('vitamins')} />
            </label>
            <label className="field">
              <span>礦物質（主要來源）</span>
              <input value={form.minerals} maxLength={120} placeholder="例如：豆腐的鈣、肉類的鐵" onChange={set('minerals')} />
            </label>
            {form.note && <p className="hint">備註：{form.note}</p>}
            <button className="btn btn-gold btn-block" disabled={!canSave} onClick={save}>
              記錄這一餐
            </button>
          </Panel>
        )}
        <p className="hint">數字為估算，只供了解飲食均衡參考，不是醫療或營養建議。每天前 {FOOD_STONES_PER_DAY} 筆紀錄各得 1 枚靈石。</p>
      </div>
    </div>,
    document.body,
  );
}

/** 洞府頁的「今日飲食」：熱量、五大營養素與紀錄清單 */
export function NutritionPanel() {
  const { save, today, update } = useGame();
  const [open, setOpen] = useState(false);
  const entries = foodOn(save, today);
  const total = sumNutrients(entries);
  const share = macroShare(total);
  const vit = [...new Set(entries.map((e) => e.vitamins).filter(Boolean))];
  const min = [...new Set(entries.map((e) => e.minerals).filter(Boolean))];

  return (
    <Panel title="今日飲食" right={<span className="muted mono">{Math.round(total.kcal).toLocaleString()} 大卡</span>}>
      {entries.length > 0 ? (
        <>
          <div className="macro-bar" aria-label={`醣類 ${share.carbs}%、蛋白質 ${share.protein}%、脂質 ${share.fat}%`}>
            <span className="m-carb" style={{ width: `${share.carbs}%` }} />
            <span className="m-pro" style={{ width: `${share.protein}%` }} />
            <span className="m-fat" style={{ width: `${share.fat}%` }} />
          </div>
          <div className="macro-legend mono">
            <span>
              <i className="m-carb" />
              醣類 {total.carbsG} g
            </span>
            <span>
              <i className="m-pro" />
              蛋白質 {total.proteinG} g
            </span>
            <span>
              <i className="m-fat" />
              脂質 {total.fatG} g
            </span>
          </div>
          {(vit.length > 0 || min.length > 0) && (
            <div className="micro">
              {vit.length > 0 && <div>維生素：{vit.join('；')}</div>}
              {min.length > 0 && <div>礦物質：{min.join('；')}</div>}
            </div>
          )}
          <ul className="food-list">
            {entries.map((e) => (
              <li key={e.id}>
                {e.thumb ? <img src={e.thumb} alt="" /> : <span className="food-ph">{MEAL_SLOT_LABEL[e.slot].slice(0, 1)}</span>}
                <div className="grow">
                  <div>
                    {e.name}
                    <span className="muted">・{MEAL_SLOT_LABEL[e.slot]}</span>
                  </div>
                  <div className="muted mono">
                    {Math.round(e.kcal)} 大卡・醣 {e.carbsG}・蛋白 {e.proteinG}・脂 {e.fatG} g
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" aria-label={`刪除${e.name}`} onClick={() => update((s) => removeFood(s, e.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="hint">拍下餐點或營養標示，估算熱量與醣類、蛋白質、脂質、維生素、礦物質五大營養素。</p>
      )}
      <button className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
        記錄餐點
      </button>
      {open && <FoodSheet onClose={() => setOpen(false)} />}
    </Panel>
  );
}
