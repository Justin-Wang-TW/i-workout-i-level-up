// 原創水墨場景：遠山、雲霧與前景石台。人物站在石台上（由外層定位）。
import { useId, type ReactNode } from 'react';
import type { SceneId } from './look.ts';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** 隨機但固定的山稜線 */
function ridge(base: number, amp: number, seed: number, w = 400): string {
  let d = `M0 ${base}`;
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let x = 0; x <= w; x += 25) {
    const y = base - amp * (0.3 + rnd() * 0.7) * (x % 100 === 50 ? 1.3 : 1);
    d += ` Q${x - 12} ${y - amp * 0.3 * rnd()} ${x} ${y}`;
  }
  return `${d} L${w} 300 L0 300 Z`;
}

const PALETTE: Record<SceneId, { sky: [string, string]; far: string; mid: string; near: string; mist: string; stone: [string, string] }> = {
  cloud_peak: { sky: ['#cfd6d2', '#8e9aa0'], far: '#9aa6a8', mid: '#5f6d70', near: '#38444a', mist: '#eef2ef', stone: ['#8b7f6a', '#5b5244'] },
  bamboo: { sky: ['#d8e3d2', '#94aa92'], far: '#9fb49b', mid: '#5d7a5f', near: '#2f4a36', mist: '#eef5ea', stone: ['#857d68', '#565041'] },
  moon_lake: { sky: ['#1d2740', '#3b4a6b'], far: '#2b3856', mid: '#202b45', near: '#151d30', mist: '#a9b8d6', stone: ['#6c6a72', '#3d3c45'] },
  cave: { sky: ['#3a1f1c', '#6b3426'], far: '#5a2c22', mid: '#40201a', near: '#2a1512', mist: '#f2b07a', stone: ['#7a5a46', '#4a3428'] },
  thunder: { sky: ['#2a2b33', '#4b4d58'], far: '#3a3c46', mid: '#2a2c34', near: '#1b1c22', mist: '#b9bccb', stone: ['#5f5a55', '#36332f'] },
  sky_palace: { sky: ['#f3e4c4', '#d9b98a'], far: '#e6cfa3', mid: '#c9a476', near: '#9b7a52', mist: '#fff6e3', stone: ['#d8cdb8', '#a99a7f'] },
};

export function Scene({ id, children, height = 300 }: { id: SceneId; children?: ReactNode; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = PALETTE[id];
  const on = !reducedMotion();
  const drift = (dur: string, dx: number) =>
    on ? <animateTransform attributeName="transform" type="translate" values={`0 0;${dx} 0;0 0`} dur={dur} repeatCount="indefinite" /> : null;

  return (
    <div className={`scene scene-${id}`} style={{ height }}>
      <svg className="scene-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.sky[0]} />
            <stop offset="100%" stopColor={p.sky[1]} />
          </linearGradient>
          <linearGradient id={`st${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.stone[0]} />
            <stop offset="100%" stopColor={p.stone[1]} />
          </linearGradient>
          <radialGradient id={`mist${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.mist} stopOpacity="0.85" />
            <stop offset="100%" stopColor={p.mist} stopOpacity="0" />
          </radialGradient>
          <filter id={`ink${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </defs>
        <rect width="400" height="300" fill={`url(#sky${uid})`} />

        {/* 天體 */}
        {id === 'moon_lake' && (
          <g>
            <circle cx="300" cy="62" r="30" fill="#f4f1de" />
            <circle cx="300" cy="62" r="48" fill="#f4f1de" opacity="0.12" />
            {[40, 90, 150, 210, 360, 120, 250].map((x, i) => (
              <circle key={i} cx={x} cy={20 + ((i * 37) % 70)} r="1" fill="#fff" opacity="0.7" />
            ))}
          </g>
        )}
        {id === 'cloud_peak' && <circle cx="86" cy="64" r="24" fill="#f6efe0" opacity="0.7" />}
        {id === 'sky_palace' && <circle cx="200" cy="70" r="60" fill="#fff6dc" opacity="0.6" />}

        {/* 遠山 */}
        <path d={ridge(150, 70, 11)} fill={p.far} opacity="0.8" filter={`url(#ink${uid})`} />

        {/* 場景主題物 */}
        {id === 'sky_palace' && <Palace />}
        {id === 'cave' && <CaveArch />}

        <path d={ridge(190, 60, 29)} fill={p.mid} opacity="0.9" filter={`url(#ink${uid})`} />

        {/* 雲霧 */}
        <g>
          {drift('26s', 30)}
          <ellipse cx="90" cy="205" rx="140" ry="22" fill={`url(#mist${uid})`} />
          <ellipse cx="330" cy="190" rx="120" ry="18" fill={`url(#mist${uid})`} />
        </g>

        {id === 'bamboo' && <Bamboo on={on} />}
        {id === 'cloud_peak' && <Pines />}

        {/* 湖面或地面 */}
        {id === 'moon_lake' ? (
          <g>
            <rect y="226" width="400" height="74" fill="#2a3a5c" />
            <ellipse cx="300" cy="246" rx="18" ry="3" fill="#f4f1de" opacity="0.5" />
            <ellipse cx="300" cy="258" rx="10" ry="2" fill="#f4f1de" opacity="0.35" />
          </g>
        ) : (
          <path d={ridge(240, 18, 53)} fill={p.near} />
        )}

        {/* 雷電 */}
        {id === 'thunder' && on && (
          <g stroke="#e9e3ff" strokeWidth="2" fill="none">
            <path d="M90 0 L100 40 L88 44 L104 92" opacity="0">
              <animate attributeName="opacity" values="0;0;1;0;0.7;0;0" keyTimes="0;0.5;0.52;0.55;0.57;0.6;1" dur="6s" repeatCount="indefinite" />
            </path>
            <path d="M320 0 L310 34 L322 38 L304 80" opacity="0">
              <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.2;0.22;0.26;1" dur="4.6s" repeatCount="indefinite" />
            </path>
          </g>
        )}
        {id === 'thunder' && (
          <g fill="#1b1c22" opacity="0.8">
            <ellipse cx="80" cy="18" rx="120" ry="34" />
            <ellipse cx="300" cy="10" rx="150" ry="36" />
          </g>
        )}

        {/* 前景雲霧 */}
        <g>
          {drift('18s', -24)}
          <ellipse cx="200" cy="270" rx="230" ry="26" fill={`url(#mist${uid})`} opacity="0.7" />
        </g>

        {/* 石台 */}
        <g filter={`url(#ink${uid})`}>
          <ellipse cx="200" cy="268" rx="118" ry="22" fill={p.stone[1]} />
          <ellipse cx="200" cy="260" rx="112" ry="18" fill={`url(#st${uid})`} />
          <path d="M120 258 q30 -6 60 0 M220 262 q24 -5 52 2" stroke={p.stone[1]} strokeWidth="1.4" fill="none" opacity="0.6" />
        </g>

        {/* 洞府滴泉 */}
        {id === 'cave' && on && (
          <g fill="#f2b07a">
            {[70, 330].map((x, i) => (
              <circle key={x} cx={x} cy="60" r="2">
                <animate attributeName="cy" values="60;230" dur="2.4s" begin={`${i * 1.1}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="2.4s" begin={`${i * 1.1}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}
      </svg>
      <div className="scene-figure">{children}</div>
    </div>
  );
}

function Pines() {
  return (
    <g fill="#2c3a3e">
      {[
        { x: 28, y: 236, s: 1 },
        { x: 372, y: 230, s: 1.2 },
        { x: 344, y: 238, s: 0.8 },
      ].map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
          <rect x="-2" y="-40" width="4" height="40" fill="#3a2f28" />
          <path d="M-22 -30 Q0 -44 22 -30 Q0 -36 -22 -30 Z M-18 -44 Q0 -58 18 -44 Q0 -50 -18 -44 Z M-12 -58 Q0 -70 12 -58 Q0 -62 -12 -58 Z" />
        </g>
      ))}
    </g>
  );
}

function Bamboo({ on }: { on: boolean }) {
  return (
    <g>
      {[18, 44, 360, 384, 336].map((x, i) => (
        <g key={x}>
          {on && <animateTransform attributeName="transform" type="rotate" values={`0 ${x} 300;${i % 2 ? 1.2 : -1.2} ${x} 300;0 ${x} 300`} dur={`${5 + i}s`} repeatCount="indefinite" />}
          <rect x={x - 3} y="0" width="6" height="300" fill={i % 2 ? '#4f7a55' : '#3f6a48'} />
          {[40, 90, 140, 190].map((y) => (
            <rect key={y} x={x - 4} y={y} width="8" height="2" fill="#2f4a36" />
          ))}
          {[60, 120, 170].map((y, j) => (
            <path key={y} d={`M${x} ${y} q${j % 2 ? 18 : -18} -4 ${j % 2 ? 30 : -30} 6 q${j % 2 ? -14 : 14} -2 ${j % 2 ? -30 : 30} -6 Z`} fill="#5d8a5f" opacity="0.9" />
          ))}
        </g>
      ))}
    </g>
  );
}

function Palace() {
  return (
    <g fill="#b88d55" opacity="0.75">
      <rect x="160" y="96" width="80" height="34" />
      <path d="M148 98 Q200 74 252 98 Z" />
      <rect x="176" y="70" width="48" height="22" />
      <path d="M168 72 Q200 54 232 72 Z" />
      <rect x="196" y="110" width="8" height="20" fill="#7a5a33" />
      <path d="M120 140 L280 140 L268 130 L132 130 Z" fill="#d6b57c" />
    </g>
  );
}

function CaveArch() {
  return (
    <g>
      <path d="M0 0 L400 0 L400 300 L360 300 Q372 140 300 70 Q200 10 100 70 Q28 140 40 300 L0 300 Z" fill="#24120f" opacity="0.9" />
      <path d="M100 70 L108 92 L116 72 M280 66 L288 94 L296 70 M190 36 L196 60 L204 38" fill="#3a1f1a" />
    </g>
  );
}
