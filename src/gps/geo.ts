// GPS 計算：距離、雜訊過濾、地圖圖磚座標

export type LatLng = [number, number];

const R = 6371000; // 地球半徑（公尺）

export function haversineM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Fix {
  lat: number;
  lng: number;
  /** 精確度（公尺） */
  accuracy: number;
  /** 毫秒時間戳 */
  time: number;
}

export const GPS_RULES = {
  /** 精確度比這差的定位點不採用 */
  maxAccuracyM: 35,
  /** 移動少於這個距離視為原地飄移 */
  minStepM: 3,
  /** 速度超過這個值視為訊號跳點（約 43 km/h） */
  maxSpeedMps: 12,
};

export type FixVerdict = 'accept' | 'inaccurate' | 'jitter' | 'jump';

/** 判斷新的定位點能不能加入軌跡 */
export function judgeFix(prev: Fix | null, next: Fix): FixVerdict {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return 'inaccurate';
  if (next.accuracy > GPS_RULES.maxAccuracyM) return 'inaccurate';
  if (!prev) return 'accept';
  const d = haversineM([prev.lat, prev.lng], [next.lat, next.lng]);
  if (d < Math.max(GPS_RULES.minStepM, next.accuracy * 0.25)) return 'jitter';
  const dt = Math.max(1, (next.time - prev.time) / 1000);
  if (d / dt > GPS_RULES.maxSpeedMps) return 'jump';
  return 'accept';
}

export function pathDistanceM(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineM(points[i - 1], points[i]);
  return total;
}

/** 配速（分:秒 / 公里） */
export function formatPace(seconds: number, meters: number): string {
  if (meters < 50) return '–';
  const secPerKm = seconds / (meters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ───── Web Mercator 圖磚座標 ─────

export const TILE = 256;

export function worldPx(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, p[0]));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((p[1] + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/** 讓整條軌跡放進 w×h 畫面的最大縮放等級 */
export function fitZoom(points: LatLng[], w: number, h: number, pad = 28, maxZoom = 18): number {
  if (points.length < 2) return 17;
  for (let z = maxZoom; z >= 3; z -= 1) {
    const ps = points.map((p) => worldPx(p, z));
    const xs = ps.map((p) => p.x);
    const ys = ps.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= w - pad * 2 && Math.max(...ys) - Math.min(...ys) <= h - pad * 2) return z;
  }
  return 3;
}

export function boundsCenter(points: LatLng[]): LatLng {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
}
