import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL, dailyMenu, estimateMenuMinutes } from '../../packages/game-core/index.ts';
import { Panel, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { completeBodyweight, updatePlayer } from '../state/game.ts';

const REST_SECONDS = 30;

type Phase =
  | { kind: 'safety' }
  | { kind: 'intro' }
  | { kind: 'exercise'; index: number }
  | { kind: 'rest'; next: number }
  | { kind: 'done' };

function useCountdown(seconds: number, running: boolean, onEnd: () => void, resetKey: string) {
  // 計時狀態綁定 resetKey：換到下一個動作時自動從頭開始，不會沿用上一個的剩餘秒數
  const [state, setState] = useState({ key: resetKey, left: seconds });
  const left = state.key === resetKey ? state.left : seconds;
  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      onEnd();
      return;
    }
    const t = window.setTimeout(() => setState({ key: resetKey, left: left - 1 }), 1000);
    return () => window.clearTimeout(t);
  }, [running, left, onEnd, resetKey]);
  return left;
}

export function Workout({ onClose }: { onClose: () => void }) {
  const { save, today, update, notify } = useGame();
  const player = save.player!;
  const menu = dailyMenu(today, player.difficulty);
  const [phase, setPhase] = useState<Phase>(player.safetyAcknowledged ? { kind: 'intro' } : { kind: 'safety' });
  const [running, setRunning] = useState(false);

  const current = phase.kind === 'exercise' ? menu[phase.index] : null;
  const isTimed = current?.exercise.kind === 'seconds';

  const goNext = () => {
    if (phase.kind !== 'exercise') return;
    setRunning(false);
    if (phase.index >= menu.length - 1) {
      update((s) => completeBodyweight(s, today));
      setPhase({ kind: 'done' });
      notify('【淬體功法】功成！', '前往「任務」領取修為');
    } else {
      setPhase({ kind: 'rest', next: phase.index + 1 });
    }
  };

  const exerciseLeft = useCountdown(
    current && isTimed ? current.amount : 0,
    phase.kind === 'exercise' && isTimed && running,
    goNext,
    phase.kind === 'exercise' ? `ex-${phase.index}` : 'none',
  );

  const endRest = () => {
    if (phase.kind === 'rest') {
      setPhase({ kind: 'exercise', index: phase.next });
      setRunning(false);
    }
  };
  const restLeft = useCountdown(REST_SECONDS, phase.kind === 'rest', endRest, phase.kind === 'rest' ? `rest-${phase.next}` : 'none');

  const doneCount = phase.kind === 'exercise' ? phase.index : phase.kind === 'rest' ? phase.next : phase.kind === 'done' ? menu.length : 0;

  return (
    <div className="overlay workout">
      <div className="workout-inner">
        <div className="workout-head">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ 離開
          </button>
          <span className="muted">
            淬體功法・{DIFFICULTY_LABEL[player.difficulty]}
          </span>
        </div>
        <ProgressBar value={doneCount} max={menu.length} />

        {phase.kind === 'safety' && (
          <Panel title="修煉前須知">
            <ul className="plain">
              <li>運動中如有胸悶、頭暈、疼痛，請立即停止。</li>
              <li>有心血管疾病、懷孕、受傷或慢性病者，請先詢問醫師。</li>
              <li>選擇平穩、不易滑倒的地面，動作以標準優先、不求快。</li>
            </ul>
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                update((s) => updatePlayer(s, { safetyAcknowledged: true }));
                setPhase({ kind: 'intro' });
              }}
            >
              我了解了
            </button>
          </Panel>
        )}

        {phase.kind === 'intro' && (
          <Panel title="今日功法" right={<span className="muted">約 {estimateMenuMinutes(menu)} 分鐘</span>}>
            <ol className="menu-list">
              {menu.map((m) => (
                <li key={m.exercise.id}>
                  <span>{m.exercise.name}</span>
                  <span className="mono">
                    {m.amount}
                    {m.exercise.kind === 'seconds' ? ' 秒' : ' 下'}
                    {m.exercise.perSide ? '（每邊）' : ''}
                  </span>
                </li>
              ))}
            </ol>
            <button className="btn btn-primary btn-block" onClick={() => setPhase({ kind: 'exercise', index: 0 })}>
              開始
            </button>
          </Panel>
        )}

        {phase.kind === 'exercise' && current && (
          <Panel title={`${phase.index + 1} / ${menu.length}`}>
            <h2 className="ex-name">{current.exercise.name}</h2>
            <div className="ex-amount mono">
              {isTimed ? `${exerciseLeft}` : current.amount}
              <small>{isTimed ? ' 秒' : ` 下${current.exercise.perSide ? '（每邊）' : ''}`}</small>
            </div>
            <p>{current.exercise.how}</p>
            <p className="hint">注意：{current.exercise.caution}</p>
            {isTimed ? (
              <div className="water-actions">
                <button className="btn btn-primary" onClick={() => setRunning((r) => !r)}>
                  {running ? '暫停' : exerciseLeft === current.amount ? '開始計時' : '繼續'}
                </button>
                <button className="btn btn-ghost" onClick={goNext}>
                  完成
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-block" onClick={goNext}>
                完成 {current.amount} 下
              </button>
            )}
          </Panel>
        )}

        {phase.kind === 'rest' && (
          <Panel title="調息">
            <div className="ex-amount mono">
              {restLeft}
              <small> 秒</small>
            </div>
            <p>下一個：{menu[phase.next].exercise.name}</p>
            <button className="btn btn-ghost btn-block" onClick={endRest}>
              跳過調息
            </button>
          </Panel>
        )}

        {phase.kind === 'done' && (
          <Panel title="【天道】功課圓滿">
            <p>今日淬體功法已修煉完畢，筋骨又堅韌了幾分。前往「任務」領取修為吧！</p>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              返回
            </button>
          </Panel>
        )}
      </div>
    </div>
  );
}
