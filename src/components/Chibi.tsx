// 原創 Q版修士：大頭小身、盤坐蒲團吐納。髮型、髮色、衣色、表情、頭飾、靈寵可自訂；
// 境界特效與法寶會疊加在身上。
import { useId, type ReactNode } from 'react';
import type { GearSlot, RealmId } from '../../packages/game-core/index.ts';
import type { AvatarId } from '../state/types.ts';
import { REALM_COLOR } from './Cultivator.tsx';
import { shade, type Look } from './look.ts';

const ORDER: RealmId[] = ['qi', 'foundation', 'core', 'nascent', 'spirit', 'tribulation', 'ascension'];
const atLeast = (realm: RealmId, min: RealmId) => ORDER.indexOf(realm) >= ORDER.indexOf(min);
const SKIN = '#f7dcc6';
const SKIN_SHADE = '#e8bfa3';
const INK = '#3a2a25';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function Chibi({
  look,
  avatar,
  realm = 'qi',
  size = 180,
  animate = true,
  gear = {},
  showCompanion = true,
}: {
  look: Look;
  avatar: AvatarId;
  realm?: RealmId;
  size?: number;
  animate?: boolean;
  gear?: Partial<Record<GearSlot, string>>;
  showCompanion?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const on = animate && !reducedMotion();
  const a = (n: ReactNode) => (on ? n : null);
  const aura = REALM_COLOR[realm];
  const hair = look.hairColor;
  const hairEdge = 'rgba(255,255,255,0.18)';
  const robe = look.robe;
  const robeDark = shade(robe, 0.72);
  const trim = robe === '#e9e4d8' ? '#c9a85c' : '#f3ead6';
  const hasBun = look.hair === 'bun' || look.hair === 'twin';
  const headTopY = look.hair === 'bun' ? 22 : 36;

  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" role="img" aria-label="Q版修士">
      <defs>
        <radialGradient id={`ca${uid}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={aura} stopOpacity="0.5" />
          <stop offset="65%" stopColor={aura} stopOpacity="0.12" />
          <stop offset="100%" stopColor={aura} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`cc${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="55%" stopColor="#f2c94c" />
          <stop offset="100%" stopColor="#f2c94c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cr${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={robe} />
          <stop offset="100%" stopColor={robeDark} />
        </linearGradient>
      </defs>

      {/* 飛升：金光 */}
      {realm === 'ascension' && (
        <g transform="translate(100 100)" opacity="0.45">
          <g>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M-4 0 L0 -108 L4 0 Z" fill="#ffe7a8" transform={`rotate(${i * 30})`} />
            ))}
            {a(<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite" />)}
          </g>
        </g>
      )}

      {/* 靈氣光暈 */}
      <ellipse cx="100" cy="118" rx="94" ry="100" fill={`url(#ca${uid})`}>
        {a(<animate attributeName="opacity" values="0.55;1;0.55" dur="4s" repeatCount="indefinite" />)}
      </ellipse>

      {/* 元嬰以上：頭後光環 */}
      {atLeast(realm, 'nascent') && (
        <g transform="translate(100 78)">
          {atLeast(realm, 'spirit') && (
            <g opacity="0.7">
              {Array.from({ length: 16 }, (_, i) => (
                <line key={i} x1="0" y1="-56" x2="0" y2="-66" stroke={aura} strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${i * 22.5})`} />
              ))}
              {a(<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite" />)}
            </g>
          )}
          <circle r="52" fill="none" stroke={aura} strokeWidth="2" opacity="0.8" />
        </g>
      )}

      {/* 渡劫：雷光 */}
      {realm === 'tribulation' && (
        <g fill="none" stroke="#e9e3ff" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M22 2 L34 28 L24 30 L40 60" opacity="0">
            {a(<animate attributeName="opacity" values="0;0;1;0;0;0;0.8;0" keyTimes="0;0.4;0.42;0.46;0.7;0.72;0.74;1" dur="5s" repeatCount="indefinite" />)}
          </path>
          <path d="M178 0 L166 24 L176 26 L158 56" opacity="0">
            {a(<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.15;0.17;0.21;1" dur="4.3s" repeatCount="indefinite" />)}
          </path>
        </g>
      )}

      {/* 本命法寶（築基起，依原本的修士類型） */}
      {atLeast(realm, 'foundation') && <Treasure avatar={avatar} aura={aura} trim={trim} on={on} />}

      {/* 蒲團 */}
      <ellipse cx="100" cy="202" rx="62" ry="11" fill="#8a5a2b" />
      <ellipse cx="100" cy="199" rx="58" ry="9" fill="#b07a3e" />
      <path d="M48 199 q52 8 104 0" stroke="#d6a35d" strokeWidth="1.2" fill="none" opacity="0.7" />

      <g>
        {a(<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="4s" repeatCount="indefinite" />)}

        {/* 後髮 */}
        <HairBack style={look.hair} hair={hair} edge={hairEdge} on={on} />

        {/* 盤腿 */}
        <path d="M46 194 Q44 170 70 164 L130 164 Q156 170 154 194 Q100 206 46 194 Z" fill={robeDark} />
        <path d="M60 188 Q80 176 100 184 Q120 176 140 188" stroke={robe} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />

        {/* 身體 */}
        <path d="M76 124 Q100 116 124 124 L136 182 L64 182 Z" fill={`url(#cr${uid})`} />
        {/* 袖子 */}
        <path d="M76 126 Q56 140 60 166 Q64 184 92 180 L96 170 Q76 166 80 146 Z" fill={robe} stroke={robeDark} strokeWidth="1" />
        <path d="M124 126 Q144 140 140 166 Q136 184 108 180 L104 170 Q124 166 120 146 Z" fill={robe} stroke={robeDark} strokeWidth="1" />
        {/* 交領 */}
        <path d="M86 122 L100 146 L114 122 Z" fill={trim} />
        <path d="M91 122 L100 138 L109 122 Z" fill="#fbf7ee" />
        {/* 腰帶 */}
        <rect x="80" y="154" width="40" height="7" rx="2.5" fill={trim} />
        <path d="M100 161 L96 170 M100 161 L104 170" stroke={trim} strokeWidth="2" strokeLinecap="round" />
        {/* 結印 */}
        <ellipse cx="100" cy="178" rx="12" ry="5.5" fill={SKIN} />
        <circle cx="100" cy="174.5" r="2.4" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="0.6" />

        {/* 金丹以上：丹田金丹 */}
        {atLeast(realm, 'core') && (
          <circle cx="100" cy="166" r="8" fill={`url(#cc${uid})`}>
            {a(<animate attributeName="r" values="6;9;6" dur="2.4s" repeatCount="indefinite" />)}
          </circle>
        )}

        {/* 頸與頭 */}
        <rect x="94" y="112" width="12" height="12" rx="4" fill={SKIN_SHADE} />
        <ellipse cx="57" cy="88" rx="5" ry="7" fill={SKIN} />
        <ellipse cx="143" cy="88" rx="5" ry="7" fill={SKIN} />
        <ellipse cx="100" cy="80" rx="44" ry="41" fill={SKIN} />

        {/* 表情 */}
        <Face face={look.face} on={on} />

        {/* 前髮 */}
        <HairFront style={look.hair} hair={hair} edge={hairEdge} />

        {/* 頭飾 */}
        <Ornament id={look.ornament} hasBun={hasBun} twin={look.hair === 'twin'} headTopY={headTopY} />

        {/* 法寶（頭、身、腰、足） */}
        <ChibiGear gear={gear} headTopY={headTopY} on={on} />
      </g>

      {/* 法器 */}
      <ChibiRelic gear={gear} on={on} />

      {/* 靈寵 */}
      {showCompanion && <Companion id={look.companion} on={on} />}

      {/* 靈氣粒子 */}
      {on &&
        [62, 80, 96, 112, 128, 142].map((x, i) => (
          <circle key={i} cx={x} cy="196" r={1.4 + (i % 3) * 0.4} fill={realm === 'ascension' ? '#ffe7a8' : aura} opacity="0">
            <animate attributeName="cy" values="196;30" dur={`${4.6 + (i % 4) * 0.5}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0" dur={`${4.6 + (i % 4) * 0.5}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
          </circle>
        ))}
    </svg>
  );
}

function Face({ face, on }: { face: Look['face']; on: boolean }) {
  return (
    <g>
      {/* 眉 */}
      <path d="M76 74 Q83 71 90 73 M110 73 Q117 71 124 74" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      {face === 'calm' && (
        <path d="M76 88 Q83 94 90 88 M110 88 Q117 94 124 88" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {face === 'smile' && (
        <path d="M76 91 Q83 83 90 91 M110 91 Q117 83 124 91" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {face === 'bright' && (
        <g>
          {[83, 117].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="88" rx="6.5" ry="8" fill="#2a2233" />
              <ellipse cx={x} cy="90" rx="4.5" ry="5" fill="#4b5d8a" />
              <circle cx={x + 2} cy="85" r="2.4" fill="#fff" />
              <circle cx={x - 2} cy="92" r="1" fill="#fff" opacity="0.8" />
            </g>
          ))}
          {on && (
            <g>
              <rect x="74" y="78" width="18" height="0" fill={SKIN}>
                <animate attributeName="height" values="0;0;18;0;0" keyTimes="0;0.9;0.93;0.96;1" dur="5s" repeatCount="indefinite" />
              </rect>
              <rect x="108" y="78" width="18" height="0" fill={SKIN}>
                <animate attributeName="height" values="0;0;18;0;0" keyTimes="0;0.9;0.93;0.96;1" dur="5s" repeatCount="indefinite" />
              </rect>
            </g>
          )}
        </g>
      )}
      {/* 腮紅與嘴 */}
      <ellipse cx="72" cy="100" rx="7" ry="4" fill="#f29b9b" opacity="0.45" />
      <ellipse cx="128" cy="100" rx="7" ry="4" fill="#f29b9b" opacity="0.45" />
      {face === 'smile' ? (
        <path d="M95 101 Q100 107 105 101 Z" fill="#c25b5b" />
      ) : (
        <path d="M96 103 Q100 106 104 103" stroke="#b0675a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

function HairBack({ style, hair, edge, on }: { style: Look['hair']; hair: string; edge: string; on: boolean }) {
  if (style === 'long') {
    return <path d="M58 70 Q48 130 60 178 L140 178 Q152 130 142 70 Z" fill={hair} stroke={edge} strokeWidth="1" />;
  }
  if (style === 'ponytail') {
    return (
      <g>
        <path d="M128 40 Q170 50 164 110 Q160 140 146 158 Q152 120 140 92 Q134 70 122 52 Z" fill={hair} stroke={edge} strokeWidth="1">
          {on && <animateTransform attributeName="transform" type="rotate" values="0 128 44;4 128 44;0 128 44" dur="3.6s" repeatCount="indefinite" />}
        </path>
      </g>
    );
  }
  return null;
}

function HairFront({ style, hair, edge }: { style: Look['hair']; hair: string; edge: string }) {
  // 頭頂與瀏海
  const cap = 'M55 86 Q50 34 100 36 Q150 34 145 86 Q140 64 124 58 Q116 70 100 64 Q86 72 74 62 Q62 70 55 86 Z';
  return (
    <g fill={hair} stroke={edge} strokeWidth="1">
      <path d={cap} />
      {/* 鬢髮 */}
      <path d="M56 78 Q50 100 58 116 Q60 98 64 86 Z" />
      <path d="M144 78 Q150 100 142 116 Q140 98 136 86 Z" />
      {style === 'bun' && (
        <>
          <circle cx="100" cy="28" r="15" />
          <path d="M88 34 Q100 40 112 34" fill="none" stroke={shade(hair, 0.6)} strokeWidth="1.4" />
        </>
      )}
      {style === 'twin' && (
        <>
          <circle cx="64" cy="44" r="14" />
          <circle cx="136" cy="44" r="14" />
        </>
      )}
      {style === 'ponytail' && <path d="M112 38 Q128 30 136 42 Q126 40 118 46 Z" />}
      {style === 'short' && <path d="M70 44 L76 30 L84 42 L92 28 L100 40 L108 28 L116 42 L124 30 L130 44 Z" />}
      {style === 'long' && <path d="M92 38 Q100 30 108 38" fill="none" stroke={shade(hair, 0.6)} strokeWidth="1.2" />}
    </g>
  );
}

function Ornament({ id, hasBun, twin, headTopY }: { id: Look['ornament']; hasBun: boolean; twin: boolean; headTopY: number }) {
  if (id === 'ribbon') {
    return (
      <g>
        <path d="M58 70 Q100 54 142 70" stroke="#d6455d" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M142 70 Q156 80 152 96 M142 70 Q160 72 164 86" stroke="#d6455d" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M96 60 q4 -4 8 0 q-4 3 -8 0" fill="#f3ead6" />
      </g>
    );
  }
  if (id === 'lotus') {
    const cx = twin ? 100 : 100;
    const cy = hasBun && !twin ? 16 : headTopY - 2;
    return (
      <g transform={`translate(${cx} ${cy})`}>
        {[-24, -8, 8, 24].map((r) => (
          <path key={r} d="M0 0 Q-5 -10 0 -18 Q5 -10 0 0 Z" fill="#f6b8c9" stroke="#d97a9a" strokeWidth="0.8" transform={`rotate(${r})`} />
        ))}
        <path d="M0 0 Q-5 -12 0 -22 Q5 -12 0 0 Z" fill="#fbd3de" stroke="#d97a9a" strokeWidth="0.8" />
        <circle cx="0" cy="-2" r="2.4" fill="#f2c94c" />
      </g>
    );
  }
  if (id === 'mark') {
    return <path d="M100 64 L103 69 L100 74 L97 69 Z" fill="#d6455d" />;
  }
  if (id === 'leaf') {
    const x = twin ? 136 : hasBun ? 112 : 128;
    const y = twin ? 34 : hasBun ? 22 : 44;
    return (
      <g transform={`translate(${x} ${y}) rotate(30)`}>
        <line x1="-14" y1="0" x2="10" y2="0" stroke="#c9a85c" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 0 Q16 -8 24 0 Q16 8 8 0 Z" fill="#5fd4b0" stroke="#2f8f83" strokeWidth="0.8" />
        <path d="M8 0 L24 0" stroke="#2f8f83" strokeWidth="0.6" />
      </g>
    );
  }
  return null;
}

/** 本命法寶：劍、丹爐、符籙、金鐘 */
function Treasure({ avatar, aura, trim, on }: { avatar: AvatarId; aura: string; trim: string; on: boolean }) {
  const float = (dur: string, dy = -6) =>
    on ? <animateTransform attributeName="transform" type="translate" values={`0 0;0 ${dy};0 0`} dur={dur} repeatCount="indefinite" /> : null;
  if (avatar === 'sword') {
    return (
      <g>
        {float('3.2s')}
        <g transform="rotate(14 170 110)">
          <path d="M170 64 L174 74 L174 128 L166 128 L166 74 Z" fill="#eef5fa" stroke={aura} strokeWidth="1.2" />
          <rect x="160" y="128" width="20" height="4" rx="1.5" fill={trim} />
          <rect x="168" y="132" width="4" height="12" fill="#4a3b2a" />
          <path d="M170 146 Q164 156 172 164" stroke="#d6455d" strokeWidth="1.4" fill="none" />
        </g>
      </g>
    );
  }
  if (avatar === 'alchemy') {
    return (
      <g>
        {float('3.6s', -5)}
        <path d="M20 160 L16 172 M32 164 L32 176 M44 160 L48 172" stroke="#8a6326" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="32" cy="152" rx="16" ry="12" fill="#b5873a" stroke="#7a5420" strokeWidth="1.2" />
        <path d="M22 140 L42 140 L39 134 L25 134 Z" fill="#c99a48" stroke="#7a5420" strokeWidth="1" />
        <path d="M32 132 Q26 120 32 110 Q38 100 32 90" stroke={aura} strokeWidth="1.8" fill="none" opacity="0.7" />
      </g>
    );
  }
  if (avatar === 'talisman') {
    return (
      <g>
        {[
          { x: 18, y: 96, r: -12, d: '3.1s' },
          { x: 168, y: 92, r: 10, d: '3.7s' },
          { x: 172, y: 146, r: 18, d: '3.4s' },
        ].map((t, i) => (
          <g key={i}>
            {float(t.d, i % 2 ? -7 : 7)}
            <g transform={`rotate(${t.r} ${t.x + 6} ${t.y + 13})`}>
              <rect x={t.x} y={t.y} width="12" height="26" rx="1" fill="#f2d16b" stroke={aura} strokeWidth="1" />
              <path d={`M${t.x + 6} ${t.y + 4} l-3 4 l6 3 l-6 3 l6 3 l-3 5`} stroke="#c0392b" strokeWidth="1.2" fill="none" />
            </g>
          </g>
        ))}
      </g>
    );
  }
  return (
    <path d="M40 200 Q36 74 100 30 Q164 74 160 200 Z" fill="#f0c27a" fillOpacity="0.07" stroke="#f0c27a" strokeWidth="1.6" opacity="0.6">
      {on && <animate attributeName="opacity" values="0.3;0.75;0.3" dur="3s" repeatCount="indefinite" />}
    </path>
  );
}

function ChibiGear({ gear, headTopY, on }: { gear: Partial<Record<GearSlot, string>>; headTopY: number; on: boolean }) {
  const top = headTopY;
  return (
    <g>
      {gear.robe === 'cloud_robe' && (
        <g fill="none" stroke="#bfefff" strokeWidth="1.3" opacity="0.8" strokeLinecap="round">
          <path d="M66 156 q4 -6 9 -2 q3 4 -2 6 M134 156 q-4 -6 -9 -2 q-3 4 2 6 M84 136 q5 -5 9 -1 M107 136 q5 -5 9 -1 M62 186 q6 -7 12 -2 M126 186 q6 -7 12 -2" />
        </g>
      )}
      {gear.robe === 'star_robe' && (
        <g>
          <path d="M76 124 Q100 116 124 124 L136 182 L64 182 Z" fill="#7a5bd6" opacity="0.35" />
          {[
            [84, 146], [116, 140], [72, 164], [128, 162], [100, 172], [92, 130], [110, 156],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.3" fill="#f5efff">
              {on && <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + (i % 3) * 0.7}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}
      {gear.robe === 'herb_robe' && (
        <g fill="#7fd99a" opacity="0.85">
          {[
            [70, 152, -30], [130, 152, 30], [86, 170, -10], [114, 170, 10], [62, 190, -50], [138, 190, 50],
          ].map(([x, y, r], i) => (
            <path key={i} d="M0 0 q4 -6 0 -12 q-4 6 0 12 Z" transform={`translate(${x} ${y}) rotate(${r})`} />
          ))}
        </g>
      )}
      {gear.head === 'jade_pin' && (
        <g>
          <line x1="84" y1={top + 2} x2="118" y2={top + 10} stroke="#5fd4b0" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="84" cy={top + 2} r="3" fill="#8fe3c4" />
        </g>
      )}
      {gear.head === 'gold_crown' && (
        <g transform={`translate(0 ${top - 24})`}>
          <path d="M88 34 L90 22 L95 29 L100 18 L105 29 L110 22 L112 34 Z" fill="#f2c94c" stroke="#a8842a" strokeWidth="0.8" />
          <circle cx="100" cy="29" r="2" fill="#d6455d" />
        </g>
      )}
      {gear.head === 'frost_crown' && (
        <g transform={`translate(0 ${top - 24})`}>
          <path d="M87 35 L89 22 L94 29 L97 15 L100 25 L103 15 L106 29 L111 22 L113 35 Z" fill="#d8f2ff" stroke="#7cc8ff" strokeWidth="0.9" />
          <circle cx="100" cy="30" r="2" fill="#5bb8e8" />
        </g>
      )}
      {gear.waist === 'warm_jade' && (
        <g>
          <line x1="90" y1="161" x2="90" y2="166" stroke="#c9a85c" strokeWidth="1" />
          <circle cx="90" cy="169" r="3.8" fill="#8fe3c4" stroke="#4fa889" strokeWidth="0.8" />
          <path d="M90 173 L88 180 M90 173 L92 180" stroke="#d6455d" strokeWidth="1" />
        </g>
      )}
      {gear.waist === 'cosmos_bag' && (
        <g>
          <path d="M113 161 Q109 172 114 176 Q120 178 123 172 Q124 165 118 161 Z" fill="#8a5a2b" stroke="#c9a85c" strokeWidth="0.9" />
          <text x="117.5" y="172" fontSize="5" textAnchor="middle" fill="#f2d48a">乾</text>
        </g>
      )}
      {(gear.feet === 'cloud_boots' || gear.feet === 'flame_boots') &&
        [
          { x: 54, r: -14 },
          { x: 146, r: 14 },
        ].map((b) => (
          <g key={b.x} transform={`translate(${b.x} 192) rotate(${b.r})`}>
            <path
              d="M-11 -3 Q-12 5 -4 6 L10 6 Q14 5 12 0 L6 -4 Z"
              fill={gear.feet === 'cloud_boots' ? '#e8f7ff' : '#c0392b'}
              stroke={gear.feet === 'cloud_boots' ? '#7cc8ff' : '#f2c94c'}
              strokeWidth="0.9"
            />
          </g>
        ))}
    </g>
  );
}

function ChibiRelic({ gear, on }: { gear: Partial<Record<GearSlot, string>>; on: boolean }) {
  const float = on ? <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="3.4s" repeatCount="indefinite" /> : null;
  if (gear.relic === 'gourd') {
    return (
      <g>
        {float}
        <g transform="translate(30 40) rotate(16)">
          <circle cx="0" cy="0" r="6" fill="#d6a14a" stroke="#8a6326" strokeWidth="0.8" />
          <ellipse cx="0" cy="13" rx="9" ry="10" fill="#c98f35" stroke="#8a6326" strokeWidth="0.8" />
          <rect x="-4.5" y="4" width="9" height="2.4" fill="#a8432f" />
          <text x="0" y="16" fontSize="6" textAnchor="middle" fill="#fff3c8">福</text>
        </g>
      </g>
    );
  }
  if (gear.relic === 'thunder_bell') {
    return (
      <g>
        {float}
        <g transform="translate(30 44)">
          <path d="M-8 10 Q-8 -6 0 -8 Q8 -6 8 10 Z" fill="#a78bfa" stroke="#e9e3ff" strokeWidth="0.9" />
          <rect x="-10" y="9" width="20" height="3" rx="1" fill="#e9e3ff" />
          <circle cx="0" cy="14" r="2" fill="#f2c94c" />
        </g>
      </g>
    );
  }
  return null;
}

/** 靈寵：坐在蒲團旁 */
function Companion({ id, on }: { id: Look['companion']; on: boolean }) {
  if (id === 'none') return null;
  const bob = (dur: string) =>
    on ? <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur={dur} repeatCount="indefinite" /> : null;
  if (id === 'fox') {
    return (
      <g>
        {bob('2.8s')}
        <g transform="translate(160 176)">
          <path d="M10 18 Q30 14 28 -4 Q22 10 12 10 Z" fill="#f2a65a" stroke="#c4762e" strokeWidth="0.8">
            {on && <animateTransform attributeName="transform" type="rotate" values="0 12 14;8 12 14;0 12 14" dur="2.2s" repeatCount="indefinite" />}
          </path>
          <path d="M26 -2 Q28 6 24 8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="0" cy="12" rx="13" ry="10" fill="#f2a65a" />
          <ellipse cx="0" cy="15" rx="7" ry="6" fill="#fff3e4" />
          <circle cx="0" cy="-2" r="10" fill="#f2a65a" />
          <path d="M-9 -6 L-11 -18 L-3 -10 Z M9 -6 L11 -18 L3 -10 Z" fill="#f2a65a" stroke="#c4762e" strokeWidth="0.6" />
          <path d="M-5 0 Q0 6 5 0 Q0 3 -5 0 Z" fill="#fff3e4" />
          <path d="M-5 -3 q2 2 4 0 M1 -3 q2 2 4 0" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="1.5" r="1" fill={INK} />
        </g>
      </g>
    );
  }
  if (id === 'crane') {
    return (
      <g>
        {bob('3.4s')}
        <g transform="translate(164 168)">
          <path d="M0 30 L-3 40 M4 30 L6 40" stroke="#3a2a25" strokeWidth="1.4" />
          <ellipse cx="2" cy="22" rx="12" ry="9" fill="#fbfbf6" stroke="#c9ccd6" strokeWidth="0.8" />
          <path d="M10 20 Q18 14 14 26 Z" fill="#2a2233" />
          <path d="M-6 20 Q-10 6 -6 -4" stroke="#fbfbf6" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="-6" cy="-6" r="5" fill="#fbfbf6" stroke="#c9ccd6" strokeWidth="0.8" />
          <circle cx="-6" cy="-10" r="2.2" fill="#d6455d" />
          <path d="M-11 -5 L-19 -3 L-11 -3 Z" fill="#c9a85c" />
          <circle cx="-7.5" cy="-6.5" r="0.9" fill={INK} />
        </g>
      </g>
    );
  }
  if (id === 'cloud') {
    return (
      <g>
        {bob('2.4s')}
        <g transform="translate(166 178)">
          <path d="M-14 8 Q-18 -2 -8 -4 Q-6 -14 4 -12 Q12 -16 16 -6 Q24 -4 20 6 Q22 14 12 13 L-8 13 Q-18 14 -14 8 Z" fill="#f3f6ff" stroke="#b9c5e6" strokeWidth="0.9" />
          <path d="M-4 2 q2 -2 4 0 M6 2 q2 -2 4 0" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <ellipse cx="-6" cy="6" rx="2.6" ry="1.6" fill="#f29b9b" opacity="0.6" />
          <ellipse cx="12" cy="6" rx="2.6" ry="1.6" fill="#f29b9b" opacity="0.6" />
        </g>
      </g>
    );
  }
  // 錦鯉：繞著修士游動
  return (
    <g>
      <g transform="translate(160 150)">
        {on && <animateTransform attributeName="transform" type="translate" values="160 150;166 140;160 150" dur="3.6s" repeatCount="indefinite" />}
        <path d="M-12 0 Q0 -9 12 0 Q0 9 -12 0 Z" fill="#f2785c" stroke="#fff3e4" strokeWidth="0.8" />
        <path d="M-12 0 L-20 -6 L-18 0 L-20 6 Z" fill="#f2785c" />
        <path d="M-2 -6 Q2 -2 -2 2" fill="#fff3e4" opacity="0.8" />
        <circle cx="7" cy="-1.5" r="1.2" fill={INK} />
      </g>
    </g>
  );
}
