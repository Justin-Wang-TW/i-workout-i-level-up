// 行功模式：用手機 GPS 記錄健走／跑步路線（軌跡只存在本機）
import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, type WorkoutType } from '../../packages/game-core/index.ts';
import { Panel, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { newId, saveTrack } from '../state/game.ts';
import { formatDuration, formatPace, judgeFix, pathDistanceM, type Fix, type LatLng } from './geo.ts';
import { TrackMap } from './TrackMap.tsx';
import { GpxGuide } from './GpxImport.tsx';

type Phase = 'setup' | 'active' | 'summary';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    return wl ? await wl.request('screen') : null;
  } catch {
    return null;
  }
}

const TYPE_LABEL: Record<Exclude<WorkoutType, 'other'>, string> = { walking: '健走', running: '跑步' };

export function WalkSession({ onClose }: { onClose: () => void }) {
  const { today, update, notify } = useGame();
  const [phase, setPhase] = useState<Phase>('setup');
  const [type, setType] = useState<'walking' | 'running'>('walking');
  const [paused, setPaused] = useState(false);
  const [points, setPoints] = useState<[number, number, number][]>([]);
  const [elapsed, setElapsed] = useState(0); // 移動秒數（不含暫停）
  const [signal, setSignal] = useState<'waiting' | 'good' | 'weak' | 'error'>('waiting');
  const [errorText, setErrorText] = useState('');
  const [hasWakeLock, setHasWakeLock] = useState<boolean | null>(null);

  const watchId = useRef<number | null>(null);
  const lastFix = useRef<Fix | null>(null);
  const startedAt = useRef<number>(0);
  const pausedRef = useRef(false);
  const wake = useRef<WakeLockSentinelLike | null>(null);
  const savedRef = useRef(false);

  pausedRef.current = paused;

  const stopWatching = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    void wake.current?.release().catch(() => undefined);
    wake.current = null;
  };

  // 離開畫面時停止定位
  useEffect(() => () => stopWatching(), []);

  // 計時
  useEffect(() => {
    if (phase !== 'active' || paused) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase, paused]);

  // 回到前景時重新防止螢幕休眠
  useEffect(() => {
    if (phase !== 'active') return;
    const onVisible = async () => {
      if (document.visibilityState === 'visible' && !wake.current) {
        wake.current = await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase]);

  const start = async () => {
    if (!('geolocation' in navigator)) {
      setSignal('error');
      setErrorText('這個瀏覽器不支援定位');
      return;
    }
    setPhase('active');
    startedAt.current = Date.now();
    wake.current = await requestWakeLock();
    setHasWakeLock(!!wake.current);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: Fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: pos.timestamp || Date.now(),
        };
        setSignal(fix.accuracy <= 35 ? 'good' : 'weak');
        if (pausedRef.current) {
          lastFix.current = null; // 暫停期間的移動不計
          return;
        }
        const verdict = judgeFix(lastFix.current, fix);
        if (verdict !== 'accept') return;
        lastFix.current = fix;
        const t = Math.round((fix.time - startedAt.current) / 1000);
        setPoints((ps) => [...ps, [Math.round(fix.lat * 1e5) / 1e5, Math.round(fix.lng * 1e5) / 1e5, t]]);
      },
      (err) => {
        setSignal('error');
        setErrorText(
          err.code === err.PERMISSION_DENIED
            ? '沒有定位權限：請到 iPhone 設定 › 隱私權與安全性 › 定位服務 › Safari 網站，改為「使用 App 期間」'
            : '暫時收不到定位訊號，請到空曠處',
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const latlngs: LatLng[] = points.map((p) => [p[0], p[1]]);
  const meters = pathDistanceM(latlngs);
  const km = meters / 1000;
  const sweat = GAME_CONFIG.sweat;

  const finish = () => {
    stopWatching();
    setPaused(false);
    if (elapsed < 60 || points.length < 2) {
      setPhase('summary');
      return;
    }
    if (!savedRef.current) {
      savedRef.current = true;
      const end = new Date();
      update((s) =>
        saveTrack(s, {
          id: newId(),
          day: today,
          type,
          start: new Date(startedAt.current).toISOString(),
          end: end.toISOString(),
          durationMin: Math.round(elapsed / 60),
          distanceKm: Math.round(km * 100) / 100,
          points,
          origin: 'live',
        }),
      );
      notify('【行功圓滿】', `${TYPE_LABEL[type]} ${km.toFixed(2)} 公里・${Math.round(elapsed / 60)} 分鐘`);
    }
    setPhase('summary');
  };

  return (
    <div className="overlay workout">
      <div className="workout-inner">
        <div className="workout-head">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (phase === 'active' && elapsed >= 60 && !window.confirm('要結束並儲存這次行功嗎？')) return;
              if (phase === 'active') finish();
              stopWatching();
              onClose();
            }}
          >
            ✕ {phase === 'active' ? '結束' : '離開'}
          </button>
          <span className="muted">行功・GPS 記錄路線</span>
        </div>

        {phase === 'setup' && (
          <Panel title="開始行功">
            <div className="segmented seg-lg">
              {(['walking', 'running'] as const).map((t) => (
                <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <ul className="plain">
              <li>請讓螢幕保持亮著、停留在這個畫面；iPhone 鎖定螢幕後網頁會暫停定位。想鎖螢幕走路，請看下方「螢幕關閉時錄路線」。</li>
              <li>第一次使用會詢問定位權限，請選「允許」。</li>
              <li>軌跡只存在這支手機，不會上傳。</li>
              <li>
                單次 {sweat.exerciseMinutes} 分鐘或 {sweat.distanceKm} 公里即達揮汗門檻，修為全額。
              </li>
            </ul>
            <button className="btn btn-primary btn-block" onClick={start}>
              開始記錄
            </button>
            <GpxGuide />
          </Panel>
        )}

        {phase !== 'setup' && <TrackMap points={latlngs} follow={phase === 'active'} height={phase === 'active' ? 300 : 280} />}

        {phase === 'active' && (
          <Panel>
            <div className="walk-stats">
              <div>
                <span className="stat-label">距離</span>
                <span className="walk-big mono">{km.toFixed(2)}</span>
                <span className="muted">公里</span>
              </div>
              <div>
                <span className="stat-label">時間</span>
                <span className="walk-big mono">{formatDuration(elapsed)}</span>
              </div>
              <div>
                <span className="stat-label">配速</span>
                <span className="walk-big mono">{formatPace(elapsed, meters)}</span>
              </div>
            </div>
            <div className="xp-row">
              <span>揮汗門檻（{sweat.exerciseMinutes} 分或 {sweat.distanceKm} 公里）</span>
              <span className="mono">{Math.max(Math.round((elapsed / 60 / sweat.exerciseMinutes) * 100), Math.round((km / sweat.distanceKm) * 100)) >= 100 ? '已達成' : ''}</span>
            </div>
            <ProgressBar value={Math.max(elapsed / 60 / sweat.exerciseMinutes, km / sweat.distanceKm)} max={1} tone="gold" />
            <p className={`hint signal-${signal}`}>
              {signal === 'waiting' && '定位中…'}
              {signal === 'good' && '定位訊號良好'}
              {signal === 'weak' && '定位訊號較弱，路線可能不完整'}
              {signal === 'error' && errorText}
              {hasWakeLock === false && '・請手動保持螢幕開啟'}
            </p>
            <div className="water-actions">
              <button className="btn btn-ghost" onClick={() => setPaused((p) => !p)}>
                {paused ? '繼續' : '暫停'}
              </button>
              <button className="btn btn-primary" onClick={finish}>
                結束並儲存
              </button>
            </div>
          </Panel>
        )}

        {phase === 'summary' && (
          <Panel title={savedRef.current ? '【天道】行功圓滿' : '本次未儲存'}>
            {savedRef.current ? (
              <>
                <div className="walk-stats">
                  <div>
                    <span className="stat-label">距離</span>
                    <span className="walk-big mono">{km.toFixed(2)}</span>
                    <span className="muted">公里</span>
                  </div>
                  <div>
                    <span className="stat-label">時間</span>
                    <span className="walk-big mono">{formatDuration(elapsed)}</span>
                  </div>
                  <div>
                    <span className="stat-label">配速</span>
                    <span className="walk-big mono">{formatPace(elapsed, meters)}</span>
                  </div>
                </div>
                <p>已記為一筆{TYPE_LABEL[type]}，前往「任務」領取修為。軌跡可在「紀錄」查看。</p>
              </>
            ) : (
              <p>時間不到 1 分鐘或沒有收到足夠的定位點，這次不列入紀錄。</p>
            )}
            <button className="btn btn-primary btn-block" onClick={onClose}>
              返回洞府
            </button>
          </Panel>
        )}
      </div>
    </div>
  );
}
