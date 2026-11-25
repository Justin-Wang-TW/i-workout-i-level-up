import { useState } from 'react';
import { DIFFICULTY_LABEL, GAME_CONFIG, type Difficulty } from '../../packages/game-core/index.ts';
import { CULTIVATORS, Cultivator } from '../components/Cultivator.tsx';
import { Panel } from '../components/ui.tsx';
import { ShortcutLink } from './ShortcutLink.tsx';
import { useGame } from '../state/GameContext.tsx';
import { parseImport, updatePlayer } from '../state/game.ts';
import { RestPanel } from './Rest.tsx';
import { EMPTY_SAVE } from '../state/types.ts';

export function Settings() {
  const { save, today, update, replace, notify } = useGame();
  const player = save.player!;
  const [goal, setGoal] = useState(String(player.waterGoalMl));
  const [importText, setImportText] = useState('');

  const saveGoal = () => {
    const w = GAME_CONFIG.water;
    const n = Math.round(Number(goal));
    if (!Number.isFinite(n)) return;
    const v = Math.min(w.maxGoalMl, Math.max(w.minGoalMl, n));
    update((s) => updatePlayer(s, { waterGoalMl: v }));
    setGoal(String(v));
    notify('已更新喝水目標', `${v.toLocaleString()} ml`);
  };

  const exportData = async () => {
    const text = JSON.stringify(save, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      notify('已複製存檔', '可貼到記事本保存');
    } catch {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iwlu-save-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importData = () => {
    const data = parseImport(importText);
    if (!data) {
      notify('匯入失敗', '內容不是有效的存檔');
      return;
    }
    replace(data);
    setImportText('');
    notify('匯入完成');
  };

  const reset = () => {
    if (window.confirm('確定要刪除所有資料並重新開始嗎？這個動作無法復原。')) {
      replace({ ...EMPTY_SAVE, days: {}, ledger: [] });
    }
  };

  return (
    <div className="screen">
      <Panel title="修士">
        <label className="field">
          <span>道號</span>
          <input
            value={player.name}
            maxLength={12}
            onChange={(e) => update((s) => updatePlayer(s, { name: e.target.value }))}
          />
        </label>
        <div className="avatar-grid">
          {CULTIVATORS.map((a) => (
            <button
              key={a.id}
              className={`avatar-choice ${player.avatar === a.id ? 'selected' : ''}`}
              onClick={() => update((s) => updatePlayer(s, { avatar: a.id }))}
            >
              <Cultivator id={a.id} realm="qi" size={52} animate={false} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="修行目標">
        <div className="form-row">
          <label className="field grow">
            <span>每日喝水目標（ml）</span>
            <input inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn btn-primary" onClick={saveGoal}>
            儲存
          </button>
        </div>
        <div className="field">
          <span>淬體功法難度</span>
          <div className="segmented">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button
                key={d}
                className={player.difficulty === d ? 'active' : ''}
                onClick={() => update((s) => updatePlayer(s, { difficulty: d }))}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <RestPanel />

      <ShortcutLink />

      <Panel title="資料">
        <p className="hint">目前資料只存在這支手機的瀏覽器。清除 Safari 網站資料會一併刪除，建議偶爾備份。</p>
        <button className="btn btn-ghost btn-block" onClick={exportData}>
          備份（複製存檔）
        </button>
        <label className="field">
          <span>還原：貼上存檔內容</span>
          <textarea rows={3} value={importText} onChange={(e) => setImportText(e.target.value)} />
        </label>
        <button className="btn btn-ghost btn-block" disabled={!importText} onClick={importData}>
          還原存檔
        </button>
        <button className="btn btn-danger btn-block" onClick={reset}>
          刪除所有資料
        </button>
      </Panel>

      <p className="footer-note">我運動，我升級 v0.6 修仙版・人物與介面為原創設計</p>
    </div>
  );
}
