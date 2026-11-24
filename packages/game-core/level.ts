// 修為（XP）、等級與境界計算（需求書 2.2、2.3）
import { GAME_CONFIG, type RealmDef } from './config.ts';

const NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 從 Lv level 升到 level+1 所需修為 */
export function xpToNextLevel(level: number): number {
  return GAME_CONFIG.levelBase + GAME_CONFIG.levelPerLevel * level;
}

/** 升到 Lv level 所需的累積修為（Lv1 = 0） */
export function cumulativeXpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  // Σ_{k=1}^{n} (base + perLevel·k) = base·n + perLevel·n(n+1)/2
  return GAME_CONFIG.levelBase * n + (GAME_CONFIG.levelPerLevel * n * (n + 1)) / 2;
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  let level = 1;
  while (level < GAME_CONFIG.maxLevel && cumulativeXpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export function realmForLevel(level: number): RealmDef {
  let current = GAME_CONFIG.realms[0];
  for (const r of GAME_CONFIG.realms) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

/** 境界在清單中的順序（練氣 = 0） */
export function realmIndex(level: number): number {
  return GAME_CONFIG.realms.indexOf(realmForLevel(level));
}

/**
 * 境界內的小階段：
 * - 練氣：一層～九層
 * - 其他：初期 / 中期 / 後期，境界最後一級為「大圓滿」
 * - 飛升：無小階段
 */
export function realmStage(level: number): { realm: RealmDef; stage: string; label: string } {
  const realm = realmForLevel(level);
  const realms = GAME_CONFIG.realms;
  const next = realms[realms.indexOf(realm) + 1];
  if (realm.id === 'ascension') return { realm, stage: '', label: '飛升仙界' };
  if (realm.id === 'qi') {
    const stage = `${NUMERALS[level] ?? level}層`;
    return { realm, stage, label: `練氣${stage}` };
  }
  const end = (next?.minLevel ?? GAME_CONFIG.maxLevel + 1) - 1; // 本境界最後一級
  const span = end - realm.minLevel + 1;
  const pos = level - realm.minLevel; // 0 起算
  let stage: string;
  if (level === end) stage = '大圓滿';
  else if (pos < span / 3) stage = '初期';
  else if (pos < (span * 2) / 3) stage = '中期';
  else stage = '後期';
  return { realm, stage, label: `${realm.name}${stage}` };
}

export interface LevelInfo {
  level: number;
  realm: RealmDef;
  /** 例如「築基中期」 */
  realmLabel: string;
  totalXp: number;
  /** 本級已累積 */
  xpIntoLevel: number;
  /** 本級需要的總量；滿級時為 0 */
  xpForThisLevel: number;
  /** 0–1 */
  progress: number;
  isMax: boolean;
}

export function levelInfo(totalXp: number): LevelInfo {
  const level = levelFromXp(totalXp);
  const isMax = level >= GAME_CONFIG.maxLevel;
  const start = cumulativeXpForLevel(level);
  const need = isMax ? 0 : xpToNextLevel(level);
  const into = Math.max(0, totalXp - start);
  const stage = realmStage(level);
  return {
    level,
    realm: stage.realm,
    realmLabel: stage.label,
    totalXp,
    xpIntoLevel: isMax ? 0 : into,
    xpForThisLevel: need,
    progress: isMax ? 1 : Math.min(1, into / need),
    isMax,
  };
}
