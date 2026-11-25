// 休養符（單日）與閉關（多日暫停）：休息不是懈怠，連修與築基都不會中斷
import { useState } from 'react';
import { PAUSE_MAX_DAYS, PAUSE_REASONS, activePause, addDays, diffDays } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { canStartPause, endPause, startPause } from '../state/cultivation.ts';
import { applyRestTicket, getDayLog, restTicketsLeft } from '../state/game.ts';

function md(day: string): string {
  const [, m, d] = day.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function RestPanel() {
  const { save, today, update, notify } = useGame();
  const ticketsLeft = restTicketsLeft(save, today);
  const usedToday = getDayLog(save, today).restTicketUsed;
  const active = activePause(save.pauses, today);
  const upcoming = (save.pauses ?? []).find((p) => p.start > today);
  const can = canStartPause(save, today);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(3);
  const [fromTomorrow, setFromTomorrow] = useState(false);
  const [reason, setReason] = useState(PAUSE_REASONS[0]);

  const start = fromTomorrow ? addDays(today, 1) : today;
  const confirm = () => {
    const r = startPause(save, today, start, days, reason);
    if (r.error) return notify('無法閉關', r.error);
    update((s) => startPause(s, today, start, days, reason).save);
    setOpen(false);
    notify('【閉關】', `${md(start)}–${md(addDays(start, days - 1))} 暫停修煉，連修與築基不會中斷`);
  };

  return (
    <Panel title="休養與閉關" right={<span className="muted">休養符本週剩 {ticketsLeft} 張</span>}>
      <div className="rest-block">
        <div>
          <b>休養符</b>
          <span className="muted">・單日</span>
        </div>
        <p className="hint">身體不適或需要休息時使用，今日算作修煉、築基照常前進。每週一補 1 張。</p>
        <button
          className="btn btn-ghost btn-block"
          disabled={usedToday || ticketsLeft <= 0 || !!active}
          onClick={() => {
            update((s) => applyRestTicket(s, today));
            notify('已使用休養符', '養精蓄銳，明日再修');
          }}
        >
          {usedToday ? '今日已使用' : '今日使用休養符'}
        </button>
      </div>

      <div className="rest-block">
        <div>
          <b>閉關</b>
          <span className="muted">・暫停多日（最多 {PAUSE_MAX_DAYS} 天）</span>
        </div>
        <p className="hint">出遊、生病或特別忙碌時使用。閉關期間連修天數凍結、築基不前進也不算缺席；逆天模式也不會崩毀。期間若照常完成功課，仍會正常計算。</p>

        {active ? (
          <div className="pause-card">
            <div className="pause-title">
              閉關中・{active.reason}
            </div>
            <div className="muted">
              {md(active.start)}–{md(active.end)}・還有 {diffDays(today, active.end) + 1} 天
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                update((s) => endPause(s, today));
                notify('【出關】', '今日起恢復修煉');
              }}
            >
              提前出關
            </button>
          </div>
        ) : upcoming ? (
          <div className="pause-card">
            <div className="pause-title">已排定閉關・{upcoming.reason}</div>
            <div className="muted">
              {md(upcoming.start)}–{md(upcoming.end)}
            </div>
            <button className="btn btn-ghost btn-block" onClick={() => update((s) => endPause(s, today))}>
              取消閉關
            </button>
          </div>
        ) : open ? (
          <div className="pause-form">
            <div className="field">
              <span>原因</span>
              <div className="chips">
                {PAUSE_REASONS.map((r) => (
                  <button key={r} className={`chip ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>開始</span>
              <div className="segmented">
                <button className={!fromTomorrow ? 'active' : ''} onClick={() => setFromTomorrow(false)}>
                  今天
                </button>
                <button className={fromTomorrow ? 'active' : ''} onClick={() => setFromTomorrow(true)}>
                  明天
                </button>
              </div>
            </div>
            <label className="field">
              <span>
                天數：<b className="mono">{days}</b> 天（{md(start)}–{md(addDays(start, days - 1))}）
              </span>
              <input type="range" min={1} max={PAUSE_MAX_DAYS} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </label>
            <div className="form-row">
              <button className="btn btn-gold" onClick={confirm}>
                確定閉關
              </button>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn btn-ghost btn-block" disabled={!can.ok} onClick={() => setOpen(true)}>
              安排閉關
            </button>
            {!can.ok && <p className="hint">{can.reason}</p>}
          </>
        )}
      </div>
    </Panel>
  );
}
