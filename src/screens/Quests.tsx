import { useState } from 'react';
import {
  GAME_CONFIG,
  addDays,
  diffDays,
  weekStartOf,
  type DailyQuestCode,
  type WeeklyQuestCode,
  type WorkoutType,
} from '../../packages/game-core/index.ts';
import { Panel, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import {
  addManualWorkout,
  claimDaily,
  claimWeekly,
  dailyStatus,
  getDayLog,
  removeWorkout,
  setManualSteps,
  weeklyStatus,
} from '../state/game.ts';

const WORKOUT_LABEL: Record<WorkoutType, string> = {
  walking: '健走',
  running: '跑步',
  other: '其他運動',
};

type Row = ReturnType<typeof dailyStatus>[number] | ReturnType<typeof weeklyStatus>[number];

function QuestRow({ q, onClaim }: { q: Row; onClaim: () => void }) {
  const isBinary = q.target === 1 && (q.unit === '次' || q.unit === '天');
  return (
    <li className={`quest ${q.claimed ? 'claimed' : q.completed ? 'done' : ''}`}>
      <div className="quest-top">
        <div>
          <div className="quest-name">{q.def.name}</div>
          <div className="quest-desc">{q.def.description}</div>
        </div>
        <div className="quest-xp mono">+{q.baseXp} 修為</div>
      </div>
      {!isBinary && (
        <>
          <ProgressBar value={q.current} max={q.target} tone={q.completed ? 'gold' : 'jade'} />
          <div className="quest-progress mono">
            {Number(q.current.toFixed(2)).toLocaleString()} / {q.target.toLocaleString()} {q.unit}
          </div>
        </>
      )}
      <div className="quest-bottom">
        {q.manualOnly && <span className="tag">手動輸入・修為減半</span>}
        {q.claimed ? (
          <span className="ok">已領取</span>
        ) : q.completed ? (
          <button className="btn btn-gold btn-sm" onClick={onClaim}>
            領取修為
          </button>
        ) : (
          <span className="muted">進行中</span>
        )}
      </div>
    </li>
  );
}

export function Quests() {
  const { save, today, update, notify } = useGame();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const daily = dailyStatus(save, today);
  const weekly = weeklyStatus(save, today);
  const log = getDayLog(save, today);
  const nextMonday = addDays(weekStartOf(today), 7);
  const daysLeft = diffDays(today, nextMonday);

  const [stepsInput, setStepsInput] = useState('');
  const [wType, setWType] = useState<WorkoutType>('walking');
  const [wMin, setWMin] = useState('');
  const [wKm, setWKm] = useState('');

  const claimD = (code: DailyQuestCode) => {
    // 先算出要顯示的數字，再用最新狀態寫入（避免連點重複領取）
    const r = claimDaily(save, today, code);
    if (r.granted === 0 && r.save === save) return;
    update((s) => claimDaily(s, today, code).save);
    notify(
      '【功課圓滿】',
      `修為 +${r.granted}${r.multiplier > 1 ? `（連續加成 ×${r.multiplier}）` : ''}${r.capped ? '・已達今日上限' : ''}`,
    );
  };
  const claimW = (code: WeeklyQuestCode) => {
    const r = claimWeekly(save, today, code);
    if (r.save === save) return;
    update((s) => claimWeekly(s, today, code).save);
    notify('【宗門週課圓滿】', `修為 +${r.granted}`);
  };

  const saveSteps = () => {
    const n = Number(stepsInput);
    if (!Number.isFinite(n) || n < 0) return;
    update((s) => setManualSteps(s, today, n));
    setStepsInput('');
    notify('已記錄步數', `${Math.round(n).toLocaleString()} 步`);
  };

  const saveWorkout = () => {
    const min = Number(wMin);
    const km = Number(wKm || 0);
    if (!Number.isFinite(min) || min <= 0) return;
    update((s) => addManualWorkout(s, today, { type: wType, durationMin: min, distanceKm: Number.isFinite(km) ? km : 0 }));
    setWMin('');
    setWKm('');
    notify('已記錄運動', `${WORKOUT_LABEL[wType]} ${min} 分鐘${km ? `・${km} 公里` : ''}`);
  };

  return (
    <div className="screen">
      <div className="segmented seg-lg">
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          每日功課
        </button>
        <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>
          宗門週課
        </button>
      </div>

      {tab === 'daily' ? (
        <Panel title="每日功課" right={<span className="muted">子時（00:00）重置</span>}>
          <ul className="quest-list">
            {daily.map((q) => (
              <QuestRow key={q.def.code} q={q} onClaim={() => claimD(q.def.code)} />
            ))}
          </ul>
          <p className="hint">
            每杯靈泉另得 {GAME_CONFIG.water.xpPerCup} 修為。修為沒有每日上限，但過猶不及，記得休息。
          </p>
        </Panel>
      ) : (
        <Panel title="宗門週課" right={<span className="muted">{daysLeft} 日後重置</span>}>
          <ul className="quest-list">
            {weekly.map((q) => (
              <QuestRow key={q.def.code} q={q} onClaim={() => claimW(q.def.code)} />
            ))}
          </ul>
          <p className="hint">宗門週課門檻參考運動部「揮汗有禮」：30 分鐘、8,000 步或 5 公里三選一。</p>
        </Panel>
      )}

      <Panel title="手動記錄">
        <p className="hint">
          {save.cloud?.linked
            ? '步數與運動由 iPhone 捷徑每天 4 次自動同步，也可用「行功」GPS 記錄。漏掉時可到「設定」執行捷徑，或在此手動補登（修為減半）。'
            : '到「設定 › 連結 iPhone 健康」設定捷徑後會自動同步。在那之前可手動輸入，步數與運動功課的修為減半。'}
        </p>
        <div className="form-row">
          <label className="field grow">
            <span>今日步數{log.stepsSource === 'shortcut' ? '（已由捷徑同步）' : ''}</span>
            <input
              inputMode="numeric"
              placeholder={log.steps ? String(log.steps) : '例如 8500'}
              value={stepsInput}
              disabled={log.stepsSource === 'shortcut'}
              onChange={(e) => setStepsInput(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button className="btn btn-primary" onClick={saveSteps} disabled={!stepsInput}>
            儲存
          </button>
        </div>

        <div className="field">
          <span>新增一筆運動</span>
          <div className="segmented">
            {(Object.keys(WORKOUT_LABEL) as WorkoutType[]).map((t) => (
              <button key={t} className={wType === t ? 'active' : ''} onClick={() => setWType(t)}>
                {WORKOUT_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label className="field grow">
            <span>時間（分鐘）</span>
            <input inputMode="numeric" value={wMin} placeholder="30" onChange={(e) => setWMin(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="field grow">
            <span>距離（公里）</span>
            <input inputMode="decimal" value={wKm} placeholder="選填" onChange={(e) => setWKm(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
          <button className="btn btn-primary" onClick={saveWorkout} disabled={!wMin}>
            新增
          </button>
        </div>

        {log.workouts.length > 0 && (
          <ul className="workout-list">
            {log.workouts.map((w) => (
              <li key={`${w.start}-${w.type}`}>
                <span>
                  {WORKOUT_LABEL[w.type]}・{w.durationMin} 分鐘{w.distanceKm ? `・${w.distanceKm} 公里` : ''}
                  {w.source === 'gps' ? (
                    <span className="tag tag-ok">GPS 行功</span>
                  ) : w.synced ? (
                    <span className={`tag ${w.source === 'manual' ? '' : 'tag-ok'}`}>{w.source === 'manual' ? '健康 App 手動' : '捷徑'}</span>
                  ) : (
                    <span className="tag">手動</span>
                  )}
                </span>
                {!w.synced && (
                  <button className="btn btn-ghost btn-sm" onClick={() => update((s) => removeWorkout(s, today, w.start))}>
                    刪除
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
