// 原創修士人物：盤坐吐納的 SVG 動畫，外觀隨境界變化。
// 練氣：靈氣與法陣 → 築基：本命法寶 → 金丹：丹田金丹 → 元嬰：頭頂光環
// → 化神：光環放射 → 渡劫：雷劫 → 飛升：金光萬丈
import { useId, type ReactNode } from 'react';
import type { RealmId } from '../../packages/game-core/index.ts';
import type { AvatarId } from '../state/types.ts';

export interface CultivatorDef {
  id: AvatarId;
  name: string;
  intro: string;
  robe: string;
  robeDark: string;
  trim: string;
  hair: 'male' | 'female';
}

export const CULTIVATORS: CultivatorDef[] = [
  { id: 'sword', name: '青衫劍修', intro: '以劍入道，本命飛劍隨身', robe: '#2f8f83', robeDark: '#1c5c55', trim: '#d8efe8', hair: 'male' },
  { id: 'alchemy', name: '素衣丹修', intro: '煉丹為業，丹爐不離左右', robe: '#e9e4d8', robeDark: '#b8ae98', trim: '#c9a85c', hair: 'female' },
  { id: 'talisman', name: '紫袍符修', intro: '以符御敵，靈符環身而舞', robe: '#6a4fa3', robeDark: '#45336d', trim: '#e6c36a', hair: 'female' },
  { id: 'body', name: '赤袍體修', intro: '肉身成聖，金鐘護體', robe: '#a8432f', robeDark: '#6c2a1d', trim: '#f0c27a', hair: 'male' },
];

export const REALM_COLOR: Record<RealmId, string> = {
  qi: '#9fe8ff',
  foundation: '#5fd4b0',
  core: '#f2c94c',
  nascent: '#b28dff',
  spirit: '#dff0ff',
  tribulation: '#a78bfa',
  ascension: '#ffd98a',
};

const ORDER: RealmId[] = ['qi', 'foundation', 'core', 'nascent', 'spirit', 'tribulation', 'ascension'];
const atLeast = (realm: RealmId, min: RealmId) => ORDER.indexOf(realm) >= ORDER.indexOf(min);

const SKIN = '#f2d6bf';
const HAIR = '#1b1a22';
/** 頭髮外緣微亮，避免在深色背景上消失 */
const HAIR_EDGE = '#5a5470';
const INK = '#3a2a25';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const PARTICLES = [
  { x: 62, r: 1.8, dur: 5.2, begin: 0 },
  { x: 78, r: 2.2, dur: 4.4, begin: 1.3 },
  { x: 92, r: 1.5, dur: 5.8, begin: 2.6 },
  { x: 108, r: 2.0, dur: 4.8, begin: 0.7 },
  { x: 122, r: 1.6, dur: 5.5, begin: 3.1 },
  { x: 138, r: 2.2, dur: 4.6, begin: 1.9 },
  { x: 70, r: 1.4, dur: 6.0, begin: 3.8 },
  { x: 130, r: 1.4, dur: 6.2, begin: 4.4 },
];

export function Cultivator({
  id,
  realm = 'qi',
  size = 160,
  animate = true,
}: {
  id: AvatarId;
  realm?: RealmId;
  size?: number;
  animate?: boolean;
}) {
  const def = CULTIVATORS.find((c) => c.id === id) ?? CULTIVATORS[0];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const aura = REALM_COLOR[realm];
  const on = animate && !prefersReducedMotion();
  const a = (node: ReactNode) => (on ? node : null);

  const bob = a(<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="4s" repeatCount="indefinite" />);

  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" role="img" aria-label={def.name}>
      <defs>
        <radialGradient id={`aura${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={aura} stopOpacity="0.55" />
          <stop offset="60%" stopColor={aura} stopOpacity="0.15" />
          <stop offset="100%" stopColor={aura} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`core${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="55%" stopColor="#f2c94c" />
          <stop offset="100%" stopColor="#f2c94c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`blade${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a9c8dc" />
        </linearGradient>
      </defs>

      {/* 飛升：金光萬丈 */}
      {realm === 'ascension' && (
        <g transform="translate(100 100)" opacity="0.5">
          <g>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M-4 0 L0 -105 L4 0 Z" fill="#ffe7a8" transform={`rotate(${i * 30})`} />
            ))}
            {a(<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite" />)}
          </g>
        </g>
      )}

      {/* 靈氣光暈 */}
      <ellipse cx="100" cy="112" rx="88" ry="100" fill={`url(#aura${uid})`}>
        {a(<animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />)}
      </ellipse>

      {/* 元嬰以上：頭後光環；化神以上：光環放射 */}
      {atLeast(realm, 'nascent') && (
        <g transform="translate(100 60)">
          {atLeast(realm, 'spirit') && (
            <g opacity="0.7">
              {Array.from({ length: 16 }, (_, i) => (
                <line key={i} x1="0" y1="-36" x2="0" y2="-46" stroke={aura} strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${i * 22.5})`} />
              ))}
              {a(<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite" />)}
            </g>
          )}
          <circle r="31" fill="none" stroke={aura} strokeWidth="2" opacity="0.85" />
          <circle r="27" fill={aura} opacity="0.12" />
        </g>
      )}

      {/* 渡劫：雷劫 */}
      {realm === 'tribulation' && (
        <g fill="none" stroke="#e9e3ff" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M28 4 L40 30 L30 32 L46 62" opacity="0">
            {a(<animate attributeName="opacity" values="0;0;1;0;0;0;0.8;0" keyTimes="0;0.4;0.42;0.46;0.7;0.72;0.74;1" dur="5s" repeatCount="indefinite" />)}
          </path>
          <path d="M172 2 L160 26 L170 28 L152 58" opacity="0">
            {a(<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.15;0.17;0.21;1" dur="4.3s" repeatCount="indefinite" />)}
          </path>
        </g>
      )}

      {/* 法陣 */}
      <g transform="translate(100 190) scale(1 0.3)">
        <g fill="none" stroke={aura} strokeWidth="2.4" opacity="0.8">
          <circle r="74" />
          <circle r="60" strokeDasharray={atLeast(realm, 'foundation') ? '6 5' : undefined} />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45})`}>
              <line x1="-7" y1="-67" x2="7" y2="-67" />
              {i % 2 === 0 && <line x1="-7" y1="-63" x2="7" y2="-63" />}
            </g>
          ))}
          <path d="M0 -60 L52 30 L-52 30 Z M0 60 L-52 -30 L52 -30 Z" strokeWidth="1.4" opacity="0.6" />
          {a(<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite" />)}
        </g>
      </g>

      {/* 體修：金鐘護體（築基起） */}
      {def.id === 'body' && atLeast(realm, 'foundation') && (
        <path d="M46 186 Q44 70 100 34 Q156 70 154 186 Z" fill="#f0c27a" fillOpacity="0.08" stroke="#f0c27a" strokeWidth="1.6" opacity="0.7">
          {a(<animate attributeName="opacity" values="0.35;0.8;0.35" dur="3s" repeatCount="indefinite" />)}
        </path>
      )}

      <g>
        {bob}
        {/* 女修長髮（在身體後方） */}
        {def.hair === 'female' && <path d="M83 52 Q72 96 78 134 L122 134 Q128 96 117 52 Z" fill={HAIR} stroke={HAIR_EDGE} strokeWidth="1" />}

        {/* 盤坐的腿與衣襬 */}
        <path d="M40 172 Q44 144 72 137 L128 137 Q156 144 160 172 Q100 188 40 172 Z" fill={def.robeDark} />
        <path d="M58 166 Q80 154 100 163 Q120 154 142 166" fill="none" stroke={def.robe} strokeWidth="3" strokeLinecap="round" opacity="0.8" />

        {/* 上身 */}
        <path d="M78 88 Q100 82 122 88 L131 142 L69 142 Z" fill={def.robe} />
        {/* 袖子 */}
        <path d="M78 88 Q58 102 61 128 Q64 148 92 147 L96 137 Q76 133 80 112 Z" fill={def.robe} stroke={def.robeDark} strokeWidth="1" />
        <path d="M122 88 Q142 102 139 128 Q136 148 108 147 L104 137 Q124 133 120 112 Z" fill={def.robe} stroke={def.robeDark} strokeWidth="1" />
        {/* 交領 */}
        <path d="M86 86 L100 108 L114 86 Z" fill={def.trim} />
        <path d="M91 86 L100 100 L109 86 Z" fill="#f7f2e7" />
        {/* 腰帶 */}
        <rect x="80" y="118" width="40" height="7" rx="2" fill={def.trim} />
        <path d="M100 125 L96 134 M100 125 L104 134" stroke={def.trim} strokeWidth="2" strokeLinecap="round" />
        {/* 結印的手 */}
        <ellipse cx="100" cy="142" rx="11" ry="5" fill={SKIN} />
        <circle cx="100" cy="138.5" r="2.2" fill={SKIN} stroke="#d9b79c" strokeWidth="0.6" />

        {/* 金丹以上：丹田金丹 */}
        {atLeast(realm, 'core') && (
          <circle cx="100" cy="130" r="9" fill={`url(#core${uid})`}>
            {a(<animate attributeName="r" values="7;10;7" dur="2.4s" repeatCount="indefinite" />)}
          </circle>
        )}

        {/* 頭部 */}
        <rect x="95" y="74" width="10" height="13" rx="3" fill={SKIN} />
        <ellipse cx="86" cy="63" rx="2.5" ry="4" fill={SKIN} />
        <ellipse cx="114" cy="63" rx="2.5" ry="4" fill={SKIN} />
        <ellipse cx="100" cy="62" rx="14" ry="16" fill={SKIN} />

        {/* 頭髮與髮髻 */}
        <path d="M85 62 Q83 42 100 41 Q117 42 115 62 Q112 51 100 50 Q88 51 85 62 Z" fill={HAIR} stroke={HAIR_EDGE} strokeWidth="1" />
        {def.hair === 'male' ? (
          <>
            <circle cx="100" cy="37" r="7.5" fill={HAIR} stroke={HAIR_EDGE} strokeWidth="1" />
            <line x1="87" y1="36" x2="113" y2="38" stroke={def.trim} strokeWidth="2" strokeLinecap="round" />
            <path d="M86 58 Q84 68 87 74" stroke={HAIR} strokeWidth="2" fill="none" />
            <path d="M114 58 Q116 68 113 74" stroke={HAIR} strokeWidth="2" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="100" cy="36" rx="9" ry="6" fill={HAIR} stroke={HAIR_EDGE} strokeWidth="1" />
            <circle cx="112" cy="40" r="3.4" fill={def.trim} />
            <path d="M112 43 L115 54" stroke={def.trim} strokeWidth="1.2" />
            <circle cx="115.5" cy="55.5" r="1.4" fill={def.trim} />
            <path d="M86 55 Q92 49 99 52 Q93 53 88 60 Z" fill={HAIR} stroke={HAIR_EDGE} strokeWidth="1" />
          </>
        )}
        {def.id === 'body' && <rect x="85.5" y="51" width="29" height="4" rx="2" fill="#c0392b" />}
        {def.id === 'talisman' && <path d="M100 52 L102 55 L100 58 L98 55 Z" fill="#d6455d" />}

        {/* 閉目、眉、唇 */}
        <path d="M90 59 L97 58 M103 58 L110 59" stroke={HAIR} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M91 64 Q94 66.4 97 64 M103 64 Q106 66.4 109 64" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M97 71 Q100 72.6 103 71" stroke="#b0675a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {def.hair === 'female' && (
          <>
            <circle cx="91" cy="68" r="2.6" fill="#f2a3a3" opacity="0.35" />
            <circle cx="109" cy="68" r="2.6" fill="#f2a3a3" opacity="0.35" />
          </>
        )}
      </g>

      {/* 築基以上：本命法寶 */}
      {atLeast(realm, 'foundation') && def.id === 'sword' && (
        <g>
          {a(<animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="3.2s" repeatCount="indefinite" />)}
          <g transform="rotate(12 164 90)">
            <path d="M164 34 L168 46 L168 112 L160 112 L160 46 Z" fill={`url(#blade${uid})`} stroke={aura} strokeWidth="1.2" />
            <line x1="164" y1="44" x2="164" y2="110" stroke="#8fb2c8" strokeWidth="0.8" />
            <rect x="153" y="112" width="22" height="4" rx="1.5" fill={def.trim} />
            <rect x="162" y="116" width="4" height="15" fill="#4a3b2a" />
            <circle cx="164" cy="133" r="3" fill={def.trim} />
            <path d="M164 133 Q158 146 166 156" stroke="#d6455d" strokeWidth="1.4" fill="none" />
          </g>
        </g>
      )}
      {atLeast(realm, 'foundation') && def.id === 'alchemy' && (
        <g>
          {a(<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="3.6s" repeatCount="indefinite" />)}
          <path d="M26 118 L22 132 M38 122 L38 136 M50 118 L54 132" stroke="#8a6326" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="38" cy="110" rx="17" ry="13" fill="#b5873a" stroke="#7a5420" strokeWidth="1.2" />
          <path d="M24 104 Q38 96 52 104" fill="none" stroke="#7a5420" strokeWidth="1.2" />
          <path d="M28 98 L48 98 L45 92 L31 92 Z" fill="#c99a48" stroke="#7a5420" strokeWidth="1" />
          <circle cx="38" cy="89" r="2.6" fill="#e3c06b" />
          <path d="M33 112 Q38 116 43 112" stroke="#f2d48a" strokeWidth="1.4" fill="none" />
          <path d="M38 86 Q32 76 38 68 Q44 60 38 50" stroke={aura} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7">
            {a(<animate attributeName="opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" />)}
          </path>
        </g>
      )}
      {atLeast(realm, 'foundation') && def.id === 'talisman' && (
        <g>
          {[
            { x: 30, y: 70, rot: -12, dur: 3.1 },
            { x: 160, y: 66, rot: 10, dur: 3.7 },
            { x: 150, y: 128, rot: 18, dur: 3.4 },
          ].map((t, i) => (
            <g key={i}>
              {a(<animateTransform attributeName="transform" type="translate" values={`0 0;0 ${i % 2 ? -7 : 7};0 0`} dur={`${t.dur}s`} repeatCount="indefinite" />)}
              <g transform={`rotate(${t.rot} ${t.x + 6} ${t.y + 13})`}>
                <rect x={t.x} y={t.y} width="12" height="26" rx="1" fill="#f2d16b" stroke={aura} strokeWidth="1" />
                <path d={`M${t.x + 6} ${t.y + 4} l-3 4 l6 3 l-6 3 l6 3 l-3 5`} stroke="#c0392b" strokeWidth="1.2" fill="none" />
              </g>
            </g>
          ))}
        </g>
      )}

      {/* 靈氣上升粒子 */}
      {on &&
        PARTICLES.map((p, i) => (
          <circle key={i} cx={p.x} cy="190" r={p.r} fill={realm === 'ascension' ? '#ffe7a8' : aura} opacity="0">
            <animate attributeName="cy" values="192;24" dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.95;0" dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
          </circle>
        ))}
    </svg>
  );
}
