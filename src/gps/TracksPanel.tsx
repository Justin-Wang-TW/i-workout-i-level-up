// 紀錄頁：行功軌跡列表與地圖
import { useState } from 'react';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { deleteTrack } from '../state/game.ts';
import { formatPace } from './geo.ts';
import { GpxGuide, GpxImportButton } from './GpxImport.tsx';
import { TrackMap } from './TrackMap.tsx';

function when(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TracksPanel() {
  const { save, update } = useGame();
  const tracks = [...(save.tracks ?? [])].reverse();
  const [selected, setSelected] = useState<string | null>(null);
  const current = tracks.find((t) => t.id === selected) ?? tracks[0];

  return (
    <Panel title="行功軌跡" right={<span className="muted">{tracks.length} 筆</span>}>
      {tracks.length === 0 ? (
        <p className="muted">還沒有軌跡。到洞府按「行功」出門走走，或匯入其他 App 錄的 GPX 路線。</p>
      ) : (
        <>
          <TrackMap points={current.points.map((p) => [p[0], p[1]])} height={240} />
          <div className="track-meta">
            <span>
              {when(current.start)}・{current.type === 'running' ? '跑步' : current.type === 'walking' ? '健走' : '其他'}
              {current.origin === 'gpx' && <span className="tag tag-ok">GPX</span>}
            </span>
            <span className="mono">
              {current.distanceKm.toFixed(2)} 公里・{current.durationMin} 分・配速 {formatPace(current.durationMin * 60, current.distanceKm * 1000)}
            </span>
          </div>
          <ul className="ledger">
            {tracks.map((t) => (
              <li key={t.id} className={t.id === current.id ? 'selected-track' : ''}>
                <button className="track-pick" onClick={() => setSelected(t.id)}>
                  {when(t.start)}・{t.type === 'running' ? '跑步' : t.type === 'walking' ? '健走' : '其他'}
                  {t.origin === 'gpx' ? '（匯入）' : ''}
                </button>
                <span className="mono">{t.distanceKm.toFixed(2)} km</span>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              if (window.confirm('刪除這筆軌跡？對應的運動紀錄也會一併刪除（已領取的修為不會收回）。')) {
                update((s) => deleteTrack(s, current.id));
                setSelected(null);
              }
            }}
          >
            刪除這筆軌跡
          </button>
        </>
      )}
      <GpxImportButton />
      <GpxGuide />
    </Panel>
  );
}
