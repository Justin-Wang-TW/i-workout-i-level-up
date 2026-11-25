// 本命丹火：連續修煉越久，火焰越大、顏色越高階
import { useId } from 'react';
import { flameTier } from '../state/cultivation.ts';

export function Flame({ streak, size = 44 }: { streak: number; size?: number }) {
  const tier = flameTier(streak);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scale = 0.55 + tier.size * 0.1;
  const lit = tier.size > 0;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" role="img" aria-label={`${tier.name}，連修 ${streak} 日`} className={`flame ${lit ? 'lit' : ''}`}>
      <defs>
        <radialGradient id={`fg${uid}`} cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="45%" stopColor={tier.color} />
          <stop offset="100%" stopColor={tier.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 丹爐底座 */}
      <path d="M16 50 Q30 58 44 50 L41 56 Q30 60 19 56 Z" fill="#5a4630" stroke="#c9a85c" strokeWidth="0.8" />
      {lit ? (
        <g transform={`translate(30 52) scale(${scale}) translate(-30 -52)`}>
          <circle cx="30" cy="34" r="22" fill={`url(#fg${uid})`} opacity="0.45" className="flame-glow" />
          <path className="flame-outer" d="M30 6 C40 18 46 26 44 38 C42 48 36 52 30 52 C24 52 18 48 16 38 C14 28 22 22 26 12 C27 20 30 22 30 22 C32 16 31 10 30 6 Z" fill={tier.color} />
          <path className="flame-inner" d="M30 22 C35 30 38 34 37 41 C36 47 33 50 30 50 C27 50 24 47 23 41 C22 35 27 31 30 22 Z" fill="#fff3c8" opacity="0.9" />
        </g>
      ) : (
        <g opacity="0.6">
          <circle cx="26" cy="46" r="1.6" fill="#6b6f86" />
          <circle cx="33" cy="45" r="1.2" fill="#6b6f86" />
          <path d="M28 44 q2 -6 0 -10" stroke="#6b6f86" strokeWidth="1" fill="none" />
        </g>
      )}
    </svg>
  );
}
