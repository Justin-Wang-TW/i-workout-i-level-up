// 依玩家外觀設定畫出修士：Q版（預設）或寫意版
import type { GearSlot, RealmId } from '../../packages/game-core/index.ts';
import type { Player } from '../state/types.ts';
import { Chibi } from './Chibi.tsx';
import { Cultivator } from './Cultivator.tsx';
import { defaultLook, type Look } from './look.ts';

export function lookOf(player: Pick<Player, 'avatar' | 'look'>): Look {
  return { ...defaultLook(player.avatar), ...player.look };
}

export function PlayerFigure({
  player,
  realm,
  size = 170,
  gear,
  animate = true,
  look: override,
}: {
  player: Pick<Player, 'avatar' | 'look'>;
  realm: RealmId;
  size?: number;
  gear?: Partial<Record<GearSlot, string>>;
  animate?: boolean;
  /** 形象編輯時的預覽 */
  look?: Look;
}) {
  const look = override ?? lookOf(player);
  if (look.style === 'classic') {
    return <Cultivator id={player.avatar} realm={realm} size={size} gear={gear} animate={animate} />;
  }
  return <Chibi look={look} avatar={player.avatar} realm={realm} size={size} gear={gear} animate={animate} />;
}
