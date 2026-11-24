// 匯入 GPX：選檔 → 預覽地圖與數據 → 確認匯入
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GAME_CONFIG, type WorkoutType } from '../../packages/game-core/index.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { importGpxTrack } from '../state/game.ts';
import { formatDuration, formatPace } from './geo.ts';
import { parseGpx, type GpxImport } from './gpx.ts';
import { TrackMap } from './TrackMap.tsx';

const TYPE_LABEL: Record<WorkoutType, string> = { walking: '健走', running: '跑步', other: '其他' };

function when(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function GpxImportButton({ block = true }: { block?: boolean }) {
  const { save, today, update, notify } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<GpxImport | null>(null);
  const [type, setType] = useState<WorkoutType>('walking');
  const [error, setError] = useState('');

  const pick = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('檔案太大（超過 20 MB）');
      return;
    }
    const r = parseGpx(await file.text());
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setType(r.data.detectedType ?? 'walking');
    setPreview(r.data);
  };

  const confirm = () => {
    if (!preview) return;
    const r = importGpxTrack(save, preview, type, today);
    if (!r.ok) {
      setError(r.error);
      setPreview(null);
      return;
    }
    update((s) => {
      const again = importGpxTrack(s, preview, type, today);
      return again.ok ? again.save : s;
    });
    notify('【路線已匯入】', `${TYPE_LABEL[type]} ${preview.distanceKm.toFixed(2)} 公里・${Math.round(preview.movingSec / 60)} 分鐘`);
    setPreview(null);
  };

  const sweat = GAME_CONFIG.sweat;

  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button className={`btn btn-ghost ${block ? 'btn-block' : ''}`} onClick={() => input.current?.click()}>
        匯入 GPX 路線（螢幕關閉時錄的）
      </button>
      {error && <p className="error-text">{error}</p>}

      {preview &&
        // 面板有 backdrop-filter，會困住 position: fixed，所以把預覽畫面放到 body 底下
        createPortal(
        <div className="overlay workout" role="dialog" aria-modal="true" aria-label="匯入路線">
          <div className="workout-inner">
            <div className="workout-head">
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>
                ✕ 取消
              </button>
              <span className="muted">匯入 GPX 路線</span>
            </div>
            <TrackMap points={preview.points.map((p) => [p[0], p[1]])} height={280} />
            <Panel title={preview.name}>
              <div className="walk-stats">
                <div>
                  <span className="stat-label">距離</span>
                  <span className="walk-big mono">{preview.distanceKm.toFixed(2)}</span>
                  <span className="muted">公里</span>
                </div>
                <div>
                  <span className="stat-label">移動時間</span>
                  <span className="walk-big mono">{formatDuration(preview.movingSec)}</span>
                </div>
                <div>
                  <span className="stat-label">配速</span>
                  <span className="walk-big mono">{formatPace(preview.movingSec, preview.distanceKm * 1000)}</span>
                </div>
              </div>
              <p className="muted">
                {when(preview.start)} 開始・全程 {formatDuration(preview.elapsedSec)}
                {preview.droppedJumps > 0 ? `・已濾掉 ${preview.droppedJumps} 個訊號跳點` : ''}
              </p>
              <div className="field">
                <span>運動類型{preview.detectedType ? '（已自動判斷）' : ''}</span>
                <div className="segmented">
                  {(['walking', 'running', 'other'] as const).map((t) => (
                    <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="hint">
                單次 {sweat.exerciseMinutes} 分鐘或健走／跑步 {sweat.distanceKm} 公里即達揮汗門檻，修為全額。「其他」（例如騎車）只計時間、不計距離。
              </p>
              <button className="btn btn-primary btn-block" onClick={confirm}>
                匯入並記為運動
              </button>
            </Panel>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}

export function GpxGuide() {
  return (
    <details className="guide">
      <summary>怎麼在螢幕關閉時錄路線？</summary>
      <ol>
        <li>
          在 App Store 安裝可背景錄製的軌跡 App，例如免費、無廣告的「<strong>Open GPX Tracker</strong>」。也可以用 Strava 等運動 App。
        </li>
        <li>出門前在那個 App 按開始，就可以鎖定螢幕、把手機放口袋。</li>
        <li>
          結束後匯出 GPX：Open GPX Tracker 按分享 ›「儲存到檔案」；Strava 需在電腦或手機瀏覽器開 strava.com 的活動頁 › 「⋯」›「Export GPX」。
        </li>
        <li>回到遊戲按「匯入 GPX 路線」，從「檔案」選剛剛的 .gpx。</li>
      </ol>
      <p className="hint">路線只存在這支手機。同一條路線不能重複匯入。</p>
    </details>
  );
}
