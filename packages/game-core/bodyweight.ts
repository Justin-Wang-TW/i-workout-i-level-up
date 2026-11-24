// 徒手運動菜單（需求書 3.4）
import { type DayKey } from './dates.ts';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: '初階',
  intermediate: '中階',
  advanced: '高階',
};

export interface ExerciseDef {
  id: string;
  name: string;
  /** 'reps' = 次數；'seconds' = 秒數 */
  kind: 'reps' | 'seconds';
  amount: Record<Difficulty, number>;
  /** 每邊各做一次（例如弓箭步） */
  perSide?: boolean;
  how: string;
  caution: string;
}

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squat',
    name: '深蹲',
    kind: 'reps',
    amount: { beginner: 10, intermediate: 20, advanced: 30 },
    how: '雙腳與肩同寬，臀部往後坐到大腿約與地面平行，再站起。',
    caution: '膝蓋與腳尖同方向，背部打直。',
  },
  {
    id: 'pushup',
    name: '伏地挺身',
    kind: 'reps',
    amount: { beginner: 8, intermediate: 10, advanced: 20 },
    how: '雙手略寬於肩，身體成一直線下降到胸口接近地面再推起。初階可用跪姿。',
    caution: '腰不要塌陷，手肘約 45 度向後。',
  },
  {
    id: 'plank',
    name: '棒式',
    kind: 'seconds',
    amount: { beginner: 20, intermediate: 40, advanced: 60 },
    how: '前臂撐地，身體從頭到腳成一直線，收緊腹部。',
    caution: '臀部不要翹高或下沉，記得正常呼吸。',
  },
  {
    id: 'jumping_jack',
    name: '開合跳',
    kind: 'reps',
    amount: { beginner: 20, intermediate: 30, advanced: 40 },
    how: '跳起時雙腳張開、雙手上舉，再跳回併腳。',
    caution: '用前腳掌輕落地；膝蓋不適可改成不跳的側步。',
  },
  {
    id: 'lunge',
    name: '弓箭步',
    kind: 'reps',
    perSide: true,
    amount: { beginner: 6, intermediate: 10, advanced: 15 },
    how: '一腳向前跨出，兩膝約彎成 90 度後回到站姿，左右交替。',
    caution: '前膝不要超過腳尖太多，上身保持直立。',
  },
  {
    id: 'glute_bridge',
    name: '臀橋',
    kind: 'reps',
    amount: { beginner: 12, intermediate: 20, advanced: 30 },
    how: '仰躺屈膝，腳跟出力把臀部抬高到肩膀至膝蓋成直線。',
    caution: '用臀部出力，不要過度挺腰。',
  },
  {
    id: 'mountain_climber',
    name: '登山者',
    kind: 'seconds',
    amount: { beginner: 20, intermediate: 30, advanced: 45 },
    how: '伏地挺身預備姿勢，左右膝蓋輪流往胸口快速提起。',
    caution: '肩膀在手腕正上方，臀部不要翹高。',
  },
  {
    id: 'high_knees',
    name: '原地高抬腿',
    kind: 'seconds',
    amount: { beginner: 20, intermediate: 30, advanced: 45 },
    how: '原地跑步，膝蓋抬到約腰部高度。',
    caution: '樓下有鄰居可改成原地快走抬腿。',
  },
  {
    id: 'burpee',
    name: '波比跳',
    kind: 'reps',
    amount: { beginner: 4, intermediate: 8, advanced: 10 },
    how: '蹲下雙手撐地 → 雙腳後跳成伏地挺身姿勢 → 收腳 → 向上跳起。',
    caution: '強度高，喘不過氣就放慢或改成不跳。',
  },
  {
    id: 'superman',
    name: '超人式',
    kind: 'reps',
    amount: { beginner: 10, intermediate: 15, advanced: 20 },
    how: '趴在地上，同時抬起雙手與雙腳，停 1 秒再放下。',
    caution: '動作放慢，頸部保持自然不要仰頭。',
  },
];

/** 簡單、可重現的雜湊：同一天、同難度一定拿到同一份菜單 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MenuItem {
  exercise: ExerciseDef;
  amount: number;
}

/** 產生當日菜單：4 個不重複動作，至少包含 1 個下肢、1 個上肢或核心動作 */
export function dailyMenu(day: DayKey, difficulty: Difficulty, size = 4): MenuItem[] {
  const rand = mulberry32(hash(`${day}:${difficulty}`));
  const pool = [...EXERCISES];
  // Fisher–Yates 洗牌
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const lower = ['squat', 'lunge', 'glute_bridge'];
  const upperCore = ['pushup', 'plank', 'superman', 'mountain_climber'];
  const picked: ExerciseDef[] = [];
  const take = (ids: string[]) => {
    const e = pool.find((x) => ids.includes(x.id) && !picked.includes(x));
    if (e) picked.push(e);
  };
  take(lower);
  take(upperCore);
  for (const e of pool) {
    if (picked.length >= size) break;
    if (!picked.includes(e)) picked.push(e);
  }
  // 依原始清單順序排列，讓暖身型動作不會總在最後
  picked.sort((a, b) => EXERCISES.indexOf(a) - EXERCISES.indexOf(b));
  return picked.map((exercise) => ({ exercise, amount: exercise.amount[difficulty] }));
}

export function estimateMenuMinutes(menu: MenuItem[]): number {
  const seconds = menu.reduce((sum, m) => {
    const sides = m.exercise.perSide ? 2 : 1;
    const work = m.exercise.kind === 'seconds' ? m.amount : m.amount * 3 * sides;
    return sum + work + 30; // 每個動作後休息 30 秒
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}
