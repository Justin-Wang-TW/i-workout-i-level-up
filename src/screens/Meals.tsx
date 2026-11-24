// 按時用膳：只有時段內才能打卡
import { GAME_CONFIG, mealWindowState, minutesLeft, type MealId } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { dailyRef, getDayLog, isClaimed, logMeal } from '../state/game.ts';

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MealsPanel({ onGoQuests }: { onGoQuests: () => void }) {
  const { save, today, now, update, notify } = useGame();
  const tz = save.player?.timeZone;
  const meals = getDayLog(save, today).meals ?? {};

  const eat = (id: MealId, name: string) => {
    // 按下的當下再確認一次時段
    if (mealWindowState(id, new Date(), tz) !== 'open') {
      notify('時辰已過', `${name}打卡時段已結束`);
      return;
    }
    update((s) => logMeal(s, today, id, new Date()));
    notify(`【${name}】按時用膳`, '前往「任務」領取修為');
  };

  return (
    <Panel title="按時用膳" right={<span className="muted">每餐 +10 修為</span>}>
      <ul className="meal-list">
        {GAME_CONFIG.meals.map((m) => {
          const done = meals[m.id];
          const state = mealWindowState(m.id, now, tz);
          const claimed = isClaimed(save, dailyRef(m.quest, today));
          return (
            <li key={m.id} className={done ? 'done' : state === 'open' ? 'open' : ''}>
              <div>
                <div className="meal-name">{m.name}</div>
                <div className="muted mono meal-time">
                  {m.start}–{m.end}
                </div>
              </div>
              {done ? (
                claimed ? (
                  <span className="ok">✔ {hhmm(done)} 已用膳</span>
                ) : (
                  <button className="btn btn-gold btn-sm" onClick={onGoQuests}>
                    領取修為
                  </button>
                )
              ) : state === 'open' ? (
                <button className="btn btn-primary btn-sm" onClick={() => eat(m.id, m.name)}>
                  用膳（剩 {minutesLeft(m.id, now, tz)} 分）
                </button>
              ) : state === 'before' ? (
                <span className="muted">時辰未到</span>
              ) : (
                <span className="muted">已錯過</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint">只有在時段內按下「用膳」才算數。可在 iPhone「提醒事項」設三個鬧鐘提醒自己。</p>
    </Panel>
  );
}
