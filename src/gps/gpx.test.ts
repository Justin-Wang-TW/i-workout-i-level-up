import { describe, expect, it } from 'vitest';
import { classifyGpxType, parseGpx } from './gpx.ts';

// 模擬 Strava 匯出的 GPX：每 10 秒往北約 15 公尺，共 200 點（約 33 分鐘、3 公里），中間夾一個訊號跳點
function makeGpx(opts: { type?: string; withTime?: boolean; jump?: boolean } = {}): string {
  const pts: string[] = [];
  const t0 = Date.parse('2026-11-24T06:30:00+08:00');
  for (let i = 0; i < 200; i += 1) {
    let lat = 25.03 + i * 0.000135;
    if (opts.jump && i === 100) lat += 0.05; // 約 5.5 公里外的跳點
    const time = opts.withTime === false ? '' : `<time>${new Date(t0 + i * 10_000).toISOString()}</time>`;
    pts.push(`<trkpt lat="${lat.toFixed(6)}" lon="121.565"><ele>10</ele>${time}</trkpt>`);
  }
  return `<?xml version="1.0"?><gpx version="1.1" creator="StravaGPX"><metadata><time>2026-11-23T22:30:00Z</time></metadata><trk><name><![CDATA[晨跑]]></name>${opts.type ? `<type>${opts.type}</type>` : ''}<trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}

describe('GPX 匯入', () => {
  it('解析距離、時間、類型與名稱', () => {
    const r = parseGpx(makeGpx({ type: 'running' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe('晨跑');
    expect(r.data.detectedType).toBe('running');
    expect(Math.round(r.data.distanceKm * 10) / 10).toBe(3);
    expect(r.data.elapsedSec).toBe(1990);
    expect(r.data.movingSec).toBe(1990);
    expect(r.data.start).toBe('2026-11-23T22:30:00.000Z');
  });

  it('訊號跳點會被濾掉，距離不受影響', () => {
    const r = parseGpx(makeGpx({ jump: true }));
    expect(r.ok && r.data.droppedJumps).toBe(1);
    expect(r.ok && Math.round(r.data.distanceKm * 10) / 10).toBe(3);
  });

  it('沒有時間的 GPX 不接受', () => {
    expect(parseGpx(makeGpx({ withTime: false })).ok).toBe(false);
  });

  it('不是 GPX', () => {
    expect(parseGpx('<html></html>').ok).toBe(false);
  });

  it('自閉合的 trkpt 也能讀', () => {
    const xml = '<gpx><trk><trkseg><trkpt lat="25" lon="121"/><trkpt lat="25.01" lon="121"/></trkseg></trk></gpx>';
    const r = parseGpx(xml);
    expect(r.ok).toBe(false); // 沒時間 → 拒收，但不會當掉
  });

  it('類型判斷', () => {
    expect(classifyGpxType('Walking')).toBe('walking');
    expect(classifyGpxType('hiking')).toBe('walking');
    expect(classifyGpxType('cycling')).toBe('other');
    expect(classifyGpxType(null)).toBe(null);
  });
});
