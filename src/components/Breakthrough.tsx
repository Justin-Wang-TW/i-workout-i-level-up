// 升級動畫：同境界內為「修為精進」；跨境界為「渡劫突破」
import { realmStage } from '../../packages/game-core/index.ts';
import type { Player } from '../state/types.ts';
import { PlayerFigure } from './PlayerFigure.tsx';

export function Breakthrough({
  player,
  fromLevel,
  toLevel,
  onDone,
}: {
  player: Pick<Player, 'avatar' | 'look'>;
  fromLevel: number;
  toLevel: number;
  onDone: () => void;
}) {
  const from = realmStage(fromLevel);
  const to = realmStage(toLevel);
  const realmUp = from.realm.id !== to.realm.id;

  if (!realmUp) {
    return (
      <div className="overlay center breakthrough minor" role="dialog" aria-modal="true" aria-label="修為精進">
        <div className="bt-card">
          <div className="bt-stage">
            <div className="bt-rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="bt-converge" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 30}deg)`, animationDelay: `${(i % 4) * 0.12}s` }} />
              ))}
            </div>
            <PlayerFigure player={player} realm={to.realm.id} size={170} />
          </div>
          <p className="system-tag">【修為精進】</p>
          <div className="bt-title">{to.label}</div>
          <div className="muted">
            {from.label} → {to.label}・第 {toLevel} 重
          </div>
          <button className="btn btn-primary btn-block" onClick={onDone}>
            繼續修煉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay center breakthrough realm" role="dialog" aria-modal="true" aria-label="境界突破">
      <div className="bt-clouds" aria-hidden="true" />
      <svg className="bt-bolts" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
        <path className="bolt b1" d="M120 0 L160 110 L130 115 L190 250 L165 255 L205 330" />
        <path className="bolt b2" d="M300 0 L255 120 L285 126 L225 240 L250 246 L205 330" />
        <path className="bolt b3" d="M205 0 L190 90 L215 95 L195 200 L218 205 L205 330" />
      </svg>
      <div className="bt-flash" aria-hidden="true" />
      <div className="bt-pillar" aria-hidden="true" />
      <div className="bt-card">
        <div className="bt-stage big">
          <PlayerFigure player={player} realm={to.realm.id} size={200} />
        </div>
        <div className="bt-reveal">
          <p className="system-tag">【天劫已渡】</p>
          <div className="bt-title huge">突破成功</div>
          <div className="bt-realm">
            晉入<span>{to.realm.name}</span>之境
          </div>
          <div className="muted">
            {from.label} → {to.label}・宗門賜號「{to.realm.title}」
          </div>
          <button className="btn btn-gold btn-block" onClick={onDone}>
            拜謝天道
          </button>
        </div>
      </div>
    </div>
  );
}
