import { MOODS, addDays, longestWorkoutMin, sumNutrients } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { TracksPanel } from '../gps/TracksPanel.tsx';
import { useGame } from '../state/GameContext.tsx';
import { toActivity, totalXp } from '../state/game.ts';

function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  const w = '一二三四五六日'[(new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7];
  return `${Number(m)}/${Number(d)}（${w}）`;
}

export function History() {
  const { save, today } = useGame();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const xpByDay = new Map<string, number>();
  for (const e of save.ledger) xpByDay.set(e.day, (xpByDay.get(e.day) ?? 0) + e.amount);

  const totalCups = Object.values(save.days).reduce((s, d) => s + d.cups.length, 0);
  const bodyweightDays = Object.values(save.days).filter((d) => d.bodyweightDone).length;
  const recent = [...save.ledger].reverse().slice(0, 20);
  const journals = days.map((d) => ({ day: d, j: save.days[d]?.journal })).filter((x) => x.j);
  const kcalDays = days
    .map((d) => ({ day: d, total: sumNutrients((save.food ?? []).filter((f) => f.day === d)), n: (save.food ?? []).filter((f) => f.day === d).length }))
    .filter((x) => x.n > 0);

  return (
    <div className="screen">
      <Panel title="修行總覽">
        <div className="stat-grid">
          <div className="stat-pill">
            <span className="stat-label">累積修為</span>
            <span className="stat-value">{totalXp(save).toLocaleString()}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">靈泉杯數</span>
            <span className="stat-value">{totalCups}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">淬體天數</span>
            <span className="stat-value">{bodyweightDays}</span>
          </div>
        </div>
      </Panel>

      <TracksPanel />

      <Panel title="近十四日">
        <div className="table-wrap">
          <table className="history">
            <thead>
              <tr>
                <th>日期</th>
                <th>喝水 ml</th>
                <th>步數</th>
                <th>運動分</th>
                <th>修為</th>
              </tr>
            </thead>
            <tbody>
              {days.map((k) => {
                const a = toActivity(save, k);
                return (
                  <tr key={k} className={k === today ? 'today' : ''}>
                    <td>{shortDate(k)}</td>
                    <td className="mono">{a.waterMl ? a.waterMl.toLocaleString() : '–'}</td>
                    <td className="mono">{a.steps ? a.steps.toLocaleString() : '–'}</td>
                    <td className="mono">{longestWorkoutMin(a.workouts) || '–'}</td>
                    <td className="mono">{xpByDay.get(k) ?? '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="修為明細">
        {recent.length === 0 ? (
          <p className="muted">尚無紀錄。先飲一杯靈泉吧！</p>
        ) : (
          <ul className="ledger">
            {recent.map((e) => (
              <li key={e.id}>
                <span>
                  {shortDate(e.day)} {e.reason}
                  {e.multiplier > 1 ? ` ×${e.multiplier}` : ''}
                </span>
                <span className="mono ok">+{e.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {journals.length > 0 && (
        <Panel title="修行日誌" right={<span className="muted">近 14 日</span>}>
          <ul className="journal-list">
            {journals.map(({ day, j }) => {
              const m = MOODS.find((x) => x.value === j!.mood);
              return (
                <li key={day}>
                  <span className="muted mono">{shortDate(day)}</span>
                  <span aria-label={m?.name}>{m?.emoji}</span>
                  <span>{j!.text || m?.name}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {kcalDays.length > 0 && (
        <Panel title="飲食紀錄" right={<span className="muted">近 14 日</span>}>
          <ul className="ledger">
            {kcalDays.map(({ day, total, n }) => (
              <li key={day}>
                <span>
                  {shortDate(day)} <span className="muted">{n} 筆</span>
                </span>
                <span className="mono">
                  {Math.round(total.kcal)} 大卡・醣 {Math.round(total.carbsG)}・蛋白 {Math.round(total.proteinG)}・脂 {Math.round(total.fatG)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
