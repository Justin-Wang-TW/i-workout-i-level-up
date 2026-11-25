// 靈石、精力與背包的基本存取（不依賴 game.ts，避免循環引用）
import { STAMINA_MAX, stonesForQuest } from '../../packages/game-core/index.ts';
import type { Inventory, SaveData } from './types.ts';

export function emptyInventory(): Inventory {
  return {
    stones: 0,
    stamina: 3,
    herbs: {},
    seeds: { calm_grass: 2 },
    pills: {},
    gear: [],
    equipped: {},
    plots: [null, null, null],
    expedition: null,
    log: [],
  };
}

export function getInv(save: SaveData): Inventory {
  return save.inv ?? emptyInventory();
}

/** 舊存檔第一次進入 v0.7：依過去領過的功課補發靈石（只在讀檔時執行一次） */
export function migrateInventory(save: SaveData): SaveData {
  if (save.inv || !save.player) return save;
  const retro = save.ledger
    .filter((e) => e.kind === 'daily' || e.kind === 'weekly')
    .reduce((s, e) => s + stonesForQuest(e.amount), 0);
  return { ...save, inv: { ...emptyInventory(), stones: retro } };
}

export function withInv(save: SaveData, patch: (inv: Inventory) => Inventory): SaveData {
  return { ...save, inv: patch(getInv(save)) };
}

export function addLog(inv: Inventory, text: string, at = new Date()): Inventory {
  return { ...inv, log: [{ at: at.toISOString(), text }, ...inv.log].slice(0, 20) };
}

/** 領取功課時的靈石與精力 */
export function grantQuestRewards(save: SaveData, stones: number, stamina: number): SaveData {
  return withInv(save, (inv) => ({
    ...inv,
    stones: inv.stones + stones,
    stamina: Math.min(STAMINA_MAX, inv.stamina + stamina),
  }));
}

export function addCount<K extends string>(rec: Partial<Record<K, number>>, key: K, n: number): Partial<Record<K, number>> {
  const v = (rec[key] ?? 0) + n;
  const next = { ...rec };
  if (v <= 0) delete next[key];
  else next[key] = v;
  return next;
}
