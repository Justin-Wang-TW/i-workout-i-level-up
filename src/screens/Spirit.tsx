// 道心籤（每日一抽）與修行日誌（一鍵心境＋一句話）
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { JOURNAL_MAX_CHARS, JOURNAL_STONES, LOTS, LOT_CATEGORY, MOODS, promptForDay } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { allJournals, drawDailyLot, writeJournal } from '../state/cultivation.ts';
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
  const prompt = entry?.prompt ?? promptForDay(today);
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(entry?.mood ?? 0);
  const [text, setText] = useState(entry?.text ?? '');
  const [book, setBook] = useState(false);
  const count = allJournals(save).length;

  const submit = () => {
    if (!mood) return;
    const first = !entry;
    update((s) => writeJournal(s, today, mood, text, new Date(), prompt));
    setEditing(false);
    notify('【修行日誌】已記下', first ? `靈石 +${JOURNAL_STONES}` : undefined);
  };

  const bookBtn = count > 0 && (
    <button className="btn btn-ghost btn-sm" onClick={() => setBook(true)}>
      翻閱日誌簿（{count}）
    </button>
  );

  if (entry && !editing) {
    const m = MOODS.find((x) => x.value === entry.mood);
    return (
      <Panel title="修行日誌" right={<span className="muted">今日心境：{m?.name}</span>}>
        <p className="journal-prompt">問心：{prompt}</p>
        <p className="journal-text">
          <span aria-hidden="true">{m?.emoji}</span> {entry.text || '（未寫心得）'}
        </p>
        <div className="form-row">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            修改
          </button>
          {bookBtn}
        </div>
        {book && <DiaryBook onClose={() => setBook(false)} />}
      </Panel>
    );
  }

  return (
    <Panel title="修行日誌" right={<span className="muted">只存在這支手機</span>}>
      <p className="journal-prompt">今日問心：{prompt}</p>
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
        <span>寫下回答（選填）</span>
        <textarea
          rows={3}
          value={text}
          maxLength={JOURNAL_MAX_CHARS}
          placeholder="想到什麼就寫什麼，一句也好"
          onChange={(e) => setText(e.target.value)}
        />
        <small className="mono">
          {text.length} / {JOURNAL_MAX_CHARS}
        </small>
      </label>
      <div className="form-row">
        <button className="btn btn-primary grow" disabled={!mood} onClick={submit}>
          記下
        </button>
        {bookBtn}
      </div>
      {book && <DiaryBook onClose={() => setBook(false)} />}
    </Panel>
  );
}

function md(day: string): string {
  const [y, m, d] = day.split('-');
  return `${y}/${Number(m)}/${Number(d)}`;
}

/** 私人日誌簿：只存在本機 */
export function DiaryBook({ onClose }: { onClose: () => void }) {
  const { save } = useGame();
  const list = allJournals(save);
  const [mood, setMood] = useState(0);
  const shown = mood ? list.filter((j) => j.mood === mood) : list;
  return createPortal(
    <div className="overlay workout" role="dialog" aria-modal="true" aria-label="日誌簿">
      <div className="screen sheet">
        <header className="sheet-head">
          <h2>日誌簿</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            關閉
          </button>
        </header>
        <p className="hint">共 {list.length} 篇。日誌只存在這支手機，不會上傳；備份檔會一併包含。</p>
        <div className="chips">
          <button className={`chip ${mood === 0 ? 'active' : ''}`} onClick={() => setMood(0)}>
            全部
          </button>
          {MOODS.map((m) => (
            <button key={m.value} className={`chip ${mood === m.value ? 'active' : ''}`} onClick={() => setMood(m.value)}>
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
        <ul className="diary">
          {shown.map((j) => {
            const m = MOODS.find((x) => x.value === j.mood);
            return (
              <li key={j.day} className="panel">
                <div className="diary-head">
                  <span className="mono">{md(j.day)}</span>
                  <span>
                    {m?.emoji} {m?.name}
                  </span>
                </div>
                {j.prompt && <p className="journal-prompt">問心：{j.prompt}</p>}
                <p className="diary-text">{j.text || '（未寫心得）'}</p>
              </li>
            );
          })}
          {shown.length === 0 && <li className="muted">這個心境還沒有紀錄。</li>}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
