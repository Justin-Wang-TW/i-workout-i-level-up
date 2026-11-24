// 解析其他運動 App 匯出的 GPX 路線（Open GPX Tracker、Strava 網頁版「Export GPX」等）
// 不依賴 DOMParser，方便在 Node 測試。
import type { WorkoutType } from '../../packages/game-core/index.ts';
import { GPS_RULES, haversineM } from './geo.ts';

export interface GpxImport {
  name: string;
  /** GPX 裡的運動類型；判斷不出來時為 null，由使用者選擇 */
  detectedType: WorkoutType | null;
  start: string;
  end: string;
  /** 起訖總時間（秒） */
  elapsedSec: number;
  /** 實際移動時間（秒），扣掉停下來的時段 */
  movingSec: number;
  distanceKm: number;
  /** [緯度, 經度, 秒（相對開始）] */
  points: [number, number, number][];
  /** 被濾掉的訊號跳點數 */
  droppedJumps: number;
}

const MAX_POINTS = 1500;

function attr(tagAttrs: string, name: string): number {
  const m = tagAttrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`));
  return m ? Number(m[1]) : NaN;
}

function textOf(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</(?:\\w+:)?${tag}>`));
  return m ? m[1].trim() : null;
}

export function classifyGpxType(raw: string | null): WorkoutType | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  if (/run|跑|^9$/.test(t)) return 'running';
  if (/walk|hik|步行|健走|散步|健行|登山|^10$/.test(t)) return 'walking';
  if (/cycl|bik|ride|騎|swim|游/.test(t)) return 'other';
  return null;
}

export function parseGpx(xml: string): { ok: true; data: GpxImport } | { ok: false; error: string } {
  if (!/<(?:\w+:)?gpx\b/i.test(xml)) return { ok: false, error: '這不是 GPX 檔案' };

  const raw: { lat: number; lng: number; time: number }[] = [];
  const re = /<(?:\w+:)?(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?\1>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const lat = attr(m[2], 'lat');
    const lng = attr(m[2], 'lon');
    const timeText = m[3] ? textOf(m[3], 'time') : null;
    const time = timeText ? Date.parse(timeText) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      raw.push({ lat, lng, time });
    }
  }
  if (raw.length < 2) return { ok: false, error: 'GPX 裡沒有足夠的軌跡點' };
  if (raw.some((p) => !Number.isFinite(p.time))) {
    return { ok: false, error: 'GPX 缺少時間資訊，無法判斷日期與運動時間（請匯出含時間的「軌跡」，不是規劃的「路線」）' };
  }
  raw.sort((a, b) => a.time - b.time);

  // 濾掉訊號跳點，計算距離與移動時間
  const kept: typeof raw = [raw[0]];
  let meters = 0;
  let movingSec = 0;
  let droppedJumps = 0;
  for (let i = 1; i < raw.length; i += 1) {
    const prev = kept[kept.length - 1];
    const p = raw[i];
    const d = haversineM([prev.lat, prev.lng], [p.lat, p.lng]);
    const dt = (p.time - prev.time) / 1000;
    if (dt > 0 && d / dt > GPS_RULES.maxSpeedMps) {
      droppedJumps += 1;
      continue;
    }
    meters += d;
    // 間隔不超過 2 分鐘、且有在移動，才算進運動時間
    if (dt > 0 && dt <= 120 && d / dt >= 0.3) movingSec += dt;
    kept.push(p);
  }

  const t0 = kept[0].time;
  const tEnd = kept[kept.length - 1].time;
  const step = Math.max(1, Math.ceil(kept.length / MAX_POINTS));
  const sampled = kept.filter((_, i) => i % step === 0 || i === kept.length - 1);

  const trkXml = xml.match(/<(?:\w+:)?trk\b[\s\S]*?<(?:\w+:)?trkseg\b/)?.[0] ?? '';
  const name = textOf(trkXml, 'name') ?? textOf(xml.split(/<(?:\w+:)?trkpt\b/)[0], 'name') ?? '匯入的路線';

  return {
    ok: true,
    data: {
      name: name.slice(0, 60),
      detectedType: classifyGpxType(textOf(trkXml, 'type')),
      start: new Date(t0).toISOString(),
      end: new Date(tEnd).toISOString(),
      elapsedSec: Math.round((tEnd - t0) / 1000),
      movingSec: Math.round(movingSec),
      distanceKm: Math.round((meters / 1000) * 100) / 100,
      points: sampled.map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5, Math.round((p.time - t0) / 1000)]),
      droppedJumps,
    },
  };
}
