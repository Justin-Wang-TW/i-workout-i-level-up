// 道心籤（每日一抽）與修行日誌（一鍵心境＋一句話）
import { useState } from 'react';
import { JOURNAL_STONES, LOTS, LOT_CATEGORY, MOODS } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { drawDailyLot, writeJournal } from '../state/cultivation.ts';
import { getDayLog } from '../state/game.ts';

export function DailyLotPanel() {
  const { save, today, update, notify } = useGame();
  const lot = getDayLog(save, today).lot;
  const [shaking, setShaking] = useState(false);

  const draw = () => {
    setShaking(true);
    window.setTimeout(() => {
      update((s) => drawDailyLot(s, today));
      setShaking(false);
    }, 900);
  };

  if (!lot) {
    return (
      <Panel title="道心籤" right={<span className="muted">每日一籤</span>}>
        <div className="lot-draw">
          <div className={`lot-tube ${shaking ? 'shake' : ''}`} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ left: `${18 + i * 14}%` }} />
            ))}
          </div>
          <button className="btn btn-gold" disabled={shaking} onClick={draw}>
            {shaking ? '搖籤中…' : '求一支道心籤'}
          </button>
        </div>
      </Panel>
    );
  }

  const cat = LOT_CATEGORY[lot.category];
  const text = LOTS[lot.category][lot.index];
  return (
    <Panel title="道心籤" right={<span className="lot-rank">{lot.rank}</span>}>
      <div className="lot-card" style={{ ['--lot' as string]: cat.color }}>
        <span className="lot-char">{cat.name}</span>
        <p className="lot-text">{text}</p>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(`【道心籤・${cat.name}】${text}`).then(() => notify('已複製籤文'))}>
        複製籤文
      </button>
    </Panel>
  );
}

export function JournalPanel() {
  const { save, today, update, notify } = useGame();
  const entry = getDayLog(save, today).journal;
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(entry?.mood ?? 0);
  const [text, setText] = useState(entry?.text ?? '');

  const submit = () => {
    if (!mood) return;
    const first = !entry;
    update((s) => writeJournal(s, today, mood, text));
    setEditing(false);
    notify('【修行日誌】已記下', first ? `靈石 +${JOURNAL_STONES}` : undefined);
  };

  if (entry && !editing) {
    const m = MOODS.find((x) => x.value === entry.mood);
    return (
      <Panel title="修行日誌" right={<span className="muted">今日心境：{m?.name}</span>}>
        <p className="journal-text">
          <span aria-hidden="true">{m?.emoji}</span> {entry.text || '（未寫心得）'}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          修改
        </button>
      </Panel>
    );
  }

  return (
    <Panel title="修行日誌" right={<span className="muted">一鍵記下今日心境</span>}>
      <div className="mood-row" role="radiogroup" aria-label="今日心境">
        {MOODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={mood === m.value}
            className={`mood ${mood === m.value ? 'active' : ''}`}
            onClick={() => setMood(m.value)}
          >
            <span aria-hidden="true">{m.emoji}</span>
            <small>{m.name}</small>
          </button>
        ))}
      </div>
      <label className="field">
        <span>今日一句（選填）</span>
        <input value={text} maxLength={200} placeholder="例如：午後散步時心情變好了" onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="btn btn-primary btn-block" disabled={!mood} onClick={submit}>
        記下
      </button>
    </Panel>
  );
}
