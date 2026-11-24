import { describe, expect, it } from 'vitest';
import { fitZoom, formatPace, haversineM, judgeFix, pathDistanceM } from './geo.ts';

describe('GPS 計算', () => {
  it('距離：緯度差 0.01 度約 1.11 公里', () => {
    const d = haversineM([25.0, 121.5], [25.01, 121.5]);
    expect(Math.round(d)).toBe(1112);
  });

  it('過濾：精確度差、原地飄移、瞬移都不採用', () => {
    const base = { lat: 25, lng: 121.5, accuracy: 10, time: 0 };
    expect(judgeFix(null, { ...base, accuracy: 80 })).toBe('inaccurate');
    expect(judgeFix(base, { ...base, lat: 25.00001, time: 5000 })).toBe('jitter');
    expect(judgeFix(base, { ...base, lat: 25.01, time: 5000 })).toBe('jump');
    expect(judgeFix(base, { ...base, lat: 25.0001, time: 10000 })).toBe('accept');
  });

  it('路線總長與配速', () => {
    const pts: [number, number][] = [[25, 121.5], [25.005, 121.5], [25.01, 121.5]];
    expect(Math.round(pathDistanceM(pts))).toBe(1112);
    expect(formatPace(600, 1000)).toBe(`10'00"`);
  });

  it('縮放：短路線放大、長路線縮小', () => {
    const short: [number, number][] = [[25, 121.5], [25.002, 121.502]];
    const long: [number, number][] = [[25, 121.5], [25.2, 121.7]];
    expect(fitZoom(short, 360, 260)).toBeGreaterThan(fitZoom(long, 360, 260));
  });
});
