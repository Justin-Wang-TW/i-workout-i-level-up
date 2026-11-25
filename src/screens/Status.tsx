import { useState } from 'react';
import {
  ATTRIBUTE_LABEL,
  GAME_CONFIG,
  PLAN_DAYS,
  isDayPaused,
  levelInfo,
  planStage,
  realmStage,
  streakMultiplier,
  tipForDay,
  type Attribute,
} from '../../packages/game-core/index.ts';
import { CULTIVATORS } from '../components/Cultivator.tsx';
import { PlayerFigure, lookOf } from '../components/PlayerFigure.tsx';
import { Scene } from '../components/Scene.tsx';
import { shade } from '../components/look.ts';
import { Flame } from '../components/Flame.tsx';
import { claimableMilestones, flameTier, pathProgress } from '../state/cultivation.ts';
import { getInv } from '../state/inventory.ts';
import { NutritionPanel } from './FoodLog.tsx';
import { DailyLotPanel, JournalPanel } from './Spirit.tsx';
import { Panel, ProgressBar } from '../components/ui.tsx';
import { MealsPanel } from './Meals.tsx';
import { useGame } from '../state/GameContext.tsx';
import {
  addCup,
  attributes,
  claimableCount,
  dailyStatus,
  streakOn,
  toActivity,
  totalXp,
  undoLastCup,
  xpEarnedOn,
} from '../state/game.ts';

const CUP_SIZES = [150, 250, 350, 500];

export function Status({
  onOpenWorkout,
  onOpenWalk,
  onGoQuests,
  onGoPath,
  onGoLook,
}: {
  onOpenWorkout: () => void;
  onOpenWalk: () => void;
  onGoQuests: () => void;
  onGoPath: () => void;
  onGoLook: () => void;
}) {
  const { save, today, update, notify } = useGame();
  const player = save.player!;
  const info = levelInfo(totalXp(save));
  const attr = attributes(save);
  const streak = streakOn(save, today);
  const mult = streakMultiplier(streak);
  const day = toActivity(save, today);
  const quests = dailyStatus(save, today);
  const claimable = claimableCount(save, today);
  const earned = xpEarnedOn(save, today);
  const waterDone = day.waterMl >= player.waterGoalMl;
  const cls = CULTIVATORS.find((c) => c.id === player.avatar) ?? CULTIVATORS[0];
  const [bursts, setBursts] = useState<{ id: number; text: string }[]>([]);
  const [absorbing, setAbsorbing] = useState(0);
  const inv = getInv(save);
  const flame = flameTier(streak);
  const plan = pathProgress(save, today);
  const milestones = claimableMilestones(save, today).length;
  const back = inv.expedition && Date.parse(inv.expedition.end) <= Date.now();
  const paused = isDayPaused(save.pauses, today);
  const look = lookOf(player);
  // 下一個「不同」的小境界（例如 化神初期 → 化神中期）
  let nextLevel = info.level + 1;
  while (nextLevel < 100 && realmStage(nextLevel).label === info.realmLabel) nextLevel += 1;
  const nextLabel = realmStage(Math.min(100, nextLevel)).label;
  const doneCount = quests.filter((q) => q.completed).length;

  const drink = () => {
    const before = day.waterMl;
    const cupXpToday = save.ledger.filter((e) => e.day === today && e.kind === 'cup').reduce((s, e) => s + e.amount, 0);
    const cap = GAME_CONFIG.dailyXpCap;
    const gains = cupXpToday < GAME_CONFIG.water.maxCupXpPerDay && (cap === null || earned < cap);
    update((s) => addCup(s, today, player.cupMl));

    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, text: gains ? `+${GAME_CONFIG.water.xpPerCup} 修為` : '靈泉入體' }]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
    setAbsorbing(id);
    window.setTimeout(() => setAbsorbing((x) => (x === id ? 0 : x)), 900);

    if (before < player.waterGoalMl && before + player.cupMl >= player.waterGoalMl) {
      notify('靈泉淬體 圓滿！', '前往「任務」領取修為');
    }
  };

  return (
    <div className="screen">
      <section className={`hero2 realm-${info.realm.id}`}>
        <Scene id={look.scene} height={300}>
          <div className={absorbing ? 'absorb' : ''}>
            <PlayerFigure player={player} realm={info.realm.id} size={176} gear={inv.equipped} />
          </div>
        </Scene>
        <button className="look-btn" onClick={onGoLook} aria-label="更換形象與場景">
          形象
        </button>
        <div className="scroll-card">
          <div className="hero-name">
            {player.name}
            <span>・{cls.name}・{info.realm.title}</span>
          </div>
          <div className="bt-head">
            <span>{info.realmLabel}</span>
            {!info.isMax && (
              <>
                <span className="bt-arrow" aria-hidden="true">
                  ≫
                </span>
                <span>{nextLabel}</span>
              </>
            )}
          </div>
          <div className="bt-cards">
            <div className={`bt-cardlet ${info.isMax ? 'done' : ''}`}>
              <div className="bt-cl-title">積累修為</div>
              <ProgressBar value={info.xpIntoLevel} max={info.xpForThisLevel || 1} tone="jade" />
              <div className="mono bt-cl-num">{info.isMax ? '圓滿' : `${info.xpIntoLevel}/${info.xpForThisLevel}`}</div>
            </div>
            <div className={`bt-cardlet ${doneCount === quests.length ? 'done' : ''}`}>
              <div className="bt-cl-title">今日功課</div>
              <ProgressBar value={doneCount} max={quests.length} tone="jade" />
              <div className="mono bt-cl-num">
                {doneCount}/{quests.length}
              </div>
            </div>
            <div className={`bt-cardlet ${streak >= 7 ? 'done' : ''}`}>
              <div className="bt-cl-title">本命丹火</div>
              <div className="bt-cl-flame">
                <Flame streak={streak} size={28} />
              </div>
              <div className="mono bt-cl-num">{streak} 日</div>
            </div>
          </div>
          <div className="bt-note">
            {info.isMax ? '已臻飛升，逍遙天地' : nextLevel === info.level + 1 ? `修為滿 ${info.xpForThisLevel} 即可突破至「${nextLabel}」` : `再升 ${nextLevel - info.level} 重即可突破至「${nextLabel}」`}
          </div>
          <div className="scroll-stats">
            {(Object.keys(ATTRIBUTE_LABEL) as Attribute[]).map((k) => (
              <span key={k}>
                {ATTRIBUTE_LABEL[k]} <b className="mono">{attr[k]}</b>
              </span>
            ))}
          </div>
          <div className="scroll-foot">
            <span>
              <span style={{ color: flame.color === '#ffffff' ? '#8a6d2f' : shade(flame.color, 0.75) }}>{flame.name}</span>
              {paused ? '・閉關中，丹火溫養不熄' : mult > 1 ? `・修為 ×${mult}` : '・連修 3 日起修為加成'}
            </span>
            <span className="mono">
              靈石 {inv.stones}・精力 {inv.stamina}
            </span>
          </div>
        </div>
      </section>

      {plan && save.path ? (
        <button className="path-mini" onClick={onGoPath}>
          <div className="path-mini-top">
            <span>
              築基・{planStage(plan.dayNo).name}期 第 <b className="mono">{plan.dayNo}</b> / {PLAN_DAYS} 日
              {save.path.hard && <span className="tag">逆天</span>}
            </span>
            <span className={plan.todayDone ? 'ok' : 'muted'}>{plan.todayDone ? '今日圓滿' : plan.pausedToday ? '閉關中' : '今日未成'} ›</span>
          </div>
          <ProgressBar value={plan.completed} max={PLAN_DAYS} tone="gold" />
          {!plan.finished && <div className="path-mini-tip">{tipForDay(plan.dayNo)}</div>}
          {milestones > 0 && <div className="ok">有 {milestones} 個里程碑可領取</div>}
        </button>
      ) : (
        <button className="path-mini" onClick={onGoPath}>
          <div className="path-mini-top">
            <span>六十六日築基</span>
            <span className="muted">開始 ›</span>
          </div>
          <div className="path-mini-tip">連續修煉 66 天，讓好習慣成為日常。</div>
        </button>
      )}
      {back && (
        <button className="claim-banner" onClick={onGoPath}>
          【歷練歸來】修士已返回洞府，前往「修行」清點戰利品 ›
        </button>
      )}

      <DailyLotPanel />

      {claimable > 0 && (
        <button className="claim-banner" onClick={onGoQuests}>
          【天道】有 {claimable} 項功課可領取修為 ›
        </button>
      )}

      <Panel title="靈泉" right={<span className={waterDone ? 'ok' : 'muted'}>{waterDone ? '今日圓滿' : `目標 ${player.waterGoalMl.toLocaleString()} ml`}</span>}>
        <div className="water-amount">
          <span className="big mono">{day.waterMl.toLocaleString()}</span>
          <span className="muted"> ml・{day.cups} 杯</span>
        </div>
        <ProgressBar value={day.waterMl} max={player.waterGoalMl} tone="water" />
        <div className="water-actions drink-row">
          {bursts.map((b) => (
            <span key={b.id} className="float-xp">
              {b.text}
            </span>
          ))}
          <button className="btn btn-primary" onClick={drink}>
            飲一杯（{player.cupMl} ml）
          </button>
          <button className="btn btn-ghost" onClick={() => update((s) => undoLastCup(s, today))} disabled={day.cups === 0}>
            復原
          </button>
        </div>
        <div className="chips" aria-label="杯量">
          {CUP_SIZES.map((ml) => (
            <button
              key={ml}
              className={`chip ${player.cupMl === ml ? 'active' : ''}`}
              onClick={() => update((s) => ({ ...s, player: s.player ? { ...s.player, cupMl: ml } : s.player }))}
            >
              {ml} ml
            </button>
          ))}
        </div>
        <p className="hint">
          每杯 +{GAME_CONFIG.water.xpPerCup} 修為，每日至多 {GAME_CONFIG.water.maxCupXpPerDay}。
        </p>
      </Panel>

      <MealsPanel onGoQuests={onGoQuests} />
      <NutritionPanel />

      <Panel title="今日功課" right={<span className="muted mono">今日 +{earned} 修為</span>}>
        <ul className="quest-mini">
          {quests.map((q) => (
            <li key={q.def.code} className={q.claimed ? 'claimed' : q.completed ? 'done' : ''}>
              <span className="check">{q.claimed ? '✔' : q.completed ? '◆' : '◇'}</span>
              <span className="qname">{q.def.name}</span>
              <span className="muted mono">
                {q.target === 1 && q.unit === '次'
                  ? q.completed
                    ? '完成'
                    : '未完成'
                  : `${q.current.toLocaleString()}/${q.target.toLocaleString()}`}
              </span>
            </li>
          ))}
        </ul>
        <div className="water-actions">
          <button className="btn btn-primary" onClick={onOpenWorkout} disabled={day.bodyweightDone}>
            {day.bodyweightDone ? '淬體已完成' : '修煉淬體功法'}
          </button>
          <button className="btn btn-primary" onClick={onOpenWalk}>
            行功（GPS 記錄路線）
          </button>
        </div>
        <button className="btn btn-ghost btn-block" onClick={onGoQuests}>
          手動記錄步數／運動
        </button>
      </Panel>

      <JournalPanel />
    </div>
  );
}
