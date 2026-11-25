// 今日功課圓滿：築基前進一日時播放
import { PLAN_DAYS, planStage, tipForDay } from '../../packages/game-core/index.ts';
import { Flame } from './Flame.tsx';

export function Celebration({
  dayNo,
  streak,
  hasPath,
  onDone,
}: {
  dayNo: number;
  streak: number;
  hasPath: boolean;
  onDone: () => void;
}) {
  return (
    <div className="overlay center celebrate" role="dialog" aria-modal="true" aria-label="今日功課圓滿" onClick={onDone}>
      <div className="cele-card" onClick={(e) => e.stopPropagation()}>
        <div className="cele-burst" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ ['--r' as string]: `${i * 20}deg`, animationDelay: `${(i % 6) * 0.08}s` }} />
          ))}
        </div>
        <div className="cele-flame">
          <Flame streak={streak} size={110} />
        </div>
        <p className="system-tag">【天道嘉許】</p>
        <div className="bt-title">今日功課圓滿</div>
        {hasPath ? (
          <p className="cele-sub">
            築基・{planStage(dayNo).name}期 第 <b className="mono">{dayNo}</b> / {PLAN_DAYS} 日
          </p>
        ) : (
          <p className="cele-sub">靈泉與行功皆已達成</p>
        )}
        <p className="muted">本命丹火已連燃 {streak} 日</p>
        {hasPath && dayNo < PLAN_DAYS && <p className="cele-tip">明日心法：{tipForDay(dayNo + 1)}</p>}
        <button className="btn btn-gold btn-block" onClick={onDone}>
          收功
        </button>
      </div>
    </div>
  );
}
