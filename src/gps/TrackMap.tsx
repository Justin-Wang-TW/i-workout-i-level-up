// 輕量地圖：以 CARTO 深色圖磚（OpenStreetMap 資料）為底，疊上 SVG 軌跡。不需額外套件。
import { useEffect, useRef, useState } from 'react';
import { TILE, boundsCenter, fitZoom, worldPx, type LatLng } from './geo.ts';

function tileUrl(z: number, x: number, y: number): string {
  const sub = 'abcd'[(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}@2x.png`;
}

export function TrackMap({
  points,
  height = 260,
  follow = false,
}: {
  points: LatLng[];
  height?: number;
  /** 行功中：以最新位置為中心 */
  follow?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 320));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasPoints = points.length > 0;
  const zoom = follow || points.length < 2 ? 17 : fitZoom(points, width, height);
  const center: LatLng = !hasPoints ? [25.0478, 121.5319] : follow ? points[points.length - 1] : boundsCenter(points);
  const c = worldPx(center, zoom);
  const left = c.x - width / 2;
  const top = c.y - height / 2;
  const n = 2 ** zoom;

  const tiles: { key: string; src: string; x: number; y: number }[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx += 1) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty += 1) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n;
      tiles.push({ key: `${zoom}/${tx}/${ty}`, src: tileUrl(zoom, wx, ty), x: tx * TILE - left, y: ty * TILE - top });
    }
  }

  const px = points.map((p) => {
    const w = worldPx(p, zoom);
    return [w.x - left, w.y - top] as const;
  });
  const line = px.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const first = px[0];
  const last = px[px.length - 1];

  return (
    <div className="track-map" ref={box} style={{ height }}>
      {hasPoints &&
        tiles.map((t) => (
          <img
            key={t.key}
            className="tile"
            src={t.src}
            alt=""
            width={TILE}
            height={TILE}
            style={{ left: t.x, top: t.y }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ))}
      <svg className="track-svg" width={width} height={height} aria-label="行功軌跡">
        {px.length > 1 && (
          <>
            <polyline points={line} fill="none" stroke="#0b0f1a" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" opacity="0.6" />
            <polyline points={line} fill="none" stroke="#e3c06b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {first && !follow && px.length > 1 && <circle cx={first[0]} cy={first[1]} r="6" fill="#5fd4b0" stroke="#fff" strokeWidth="2" />}
        {last && (
          <circle cx={last[0]} cy={last[1]} r="7" fill={follow ? '#7cc8ff' : '#e26a6a'} stroke="#fff" strokeWidth="2">
            {follow && <animate attributeName="r" values="6;9;6" dur="1.6s" repeatCount="indefinite" />}
          </circle>
        )}
      </svg>
      {!hasPoints && <div className="map-empty">等待定位訊號…</div>}
      <div className="map-attr">
        © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者 ©{' '}
        <a href="https://carto.com/attributions">CARTO</a>
      </div>
    </div>
  );
}
