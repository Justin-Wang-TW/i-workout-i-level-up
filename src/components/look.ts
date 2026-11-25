// 修士外觀：Q版造型的選項（全部為原創設計）
import type { RealmId } from '../../packages/game-core/index.ts';
import type { AvatarId } from '../state/types.ts';

export type FigureStyle = 'chibi' | 'classic';
export type HairStyle = 'bun' | 'twin' | 'ponytail' | 'long' | 'short';
export type FaceId = 'calm' | 'smile' | 'bright';
export type OrnamentId = 'none' | 'ribbon' | 'lotus' | 'mark' | 'leaf';
export type CompanionId = 'none' | 'crane' | 'fox' | 'cloud' | 'koi';
export type SceneId = 'cloud_peak' | 'bamboo' | 'moon_lake' | 'cave' | 'thunder' | 'sky_palace';

export interface Look {
  style: FigureStyle;
  hair: HairStyle;
  hairColor: string;
  robe: string;
  face: FaceId;
  ornament: OrnamentId;
  companion: CompanionId;
  scene: SceneId;
}

export const HAIR_STYLES: { id: HairStyle; name: string }[] = [
  { id: 'bun', name: '道髻' },
  { id: 'twin', name: '雙丫髻' },
  { id: 'ponytail', name: '高馬尾' },
  { id: 'long', name: '長髮披肩' },
  { id: 'short', name: '短髮' },
];

export const HAIR_COLORS = ['#1e1c26', '#4a3326', '#c9ccd6', '#26344f', '#6b2f3a'];
export const HAIR_COLOR_NAMES = ['墨黑', '栗棕', '銀白', '玄青', '赭紅'];

export const ROBE_COLORS = ['#2f8f83', '#e9e4d8', '#6a4fa3', '#a8432f', '#3c6fb0', '#d9a441', '#3a3d4a', '#d97a9a'];
export const ROBE_COLOR_NAMES = ['青', '素', '紫', '赤', '藍', '金', '玄', '粉'];

export const FACES: { id: FaceId; name: string }[] = [
  { id: 'calm', name: '閉目吐納' },
  { id: 'smile', name: '笑瞇瞇' },
  { id: 'bright', name: '炯炯有神' },
];

export const ORNAMENTS: { id: OrnamentId; name: string }[] = [
  { id: 'none', name: '無' },
  { id: 'ribbon', name: '雲紋髮帶' },
  { id: 'lotus', name: '蓮花冠' },
  { id: 'mark', name: '眉心花鈿' },
  { id: 'leaf', name: '青葉簪' },
];

export const COMPANIONS: { id: CompanionId; name: string }[] = [
  { id: 'none', name: '無' },
  { id: 'crane', name: '小仙鶴' },
  { id: 'fox', name: '小靈狐' },
  { id: 'cloud', name: '雲團精' },
  { id: 'koi', name: '錦鯉' },
];

export interface SceneDef {
  id: SceneId;
  name: string;
  realm: RealmId;
  desc: string;
}

export const SCENES: SceneDef[] = [
  { id: 'cloud_peak', name: '雲海仙山', realm: 'qi', desc: '群峰浮於雲海之上' },
  { id: 'bamboo', name: '竹林幽境', realm: 'qi', desc: '竹影搖曳，清風徐來' },
  { id: 'moon_lake', name: '月下靈湖', realm: 'foundation', desc: '一輪明月映照湖心石台' },
  { id: 'cave', name: '丹霞洞府', realm: 'core', desc: '石壁丹光，靈泉滴落' },
  { id: 'thunder', name: '雷劫荒原', realm: 'nascent', desc: '烏雲壓頂，雷光閃動' },
  { id: 'sky_palace', name: '天外仙宮', realm: 'spirit', desc: '金闕玉階，仙宮隱現' },
];

/** 依原本的四位修士給預設外觀 */
const DEFAULTS: Record<AvatarId, Partial<Look>> = {
  sword: { hair: 'bun', robe: ROBE_COLORS[0] },
  alchemy: { hair: 'long', robe: ROBE_COLORS[1], ornament: 'lotus' },
  talisman: { hair: 'twin', robe: ROBE_COLORS[2], ornament: 'mark' },
  body: { hair: 'short', robe: ROBE_COLORS[3], ornament: 'ribbon' },
};

export function defaultLook(avatar: AvatarId): Look {
  return {
    style: 'chibi',
    hair: 'bun',
    hairColor: HAIR_COLORS[0],
    robe: ROBE_COLORS[0],
    face: 'calm',
    ornament: 'none',
    companion: 'none',
    scene: 'cloud_peak',
    ...DEFAULTS[avatar],
  };
}

/** 顏色加深（給陰影與衣襬） */
export function shade(hex: string, k = 0.7): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
