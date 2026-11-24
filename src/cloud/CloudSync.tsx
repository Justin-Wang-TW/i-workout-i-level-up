import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { addDays } from '../../packages/game-core/index.ts';
import { useGame } from '../state/GameContext.tsx';
import { applyCloudHealth } from '../state/game.ts';
import { fetchHealth, isCloudConfigured } from './cloud.ts';

export type SyncState = 'idle' | 'syncing' | 'ok' | 'error';

interface CloudContextValue {
  state: SyncState;
  message: string;
  syncNow: (opts?: { quiet?: boolean }) => Promise<void>;
}

const CloudContext = createContext<CloudContextValue | null>(null);

const AUTO_INTERVAL_MS = 10 * 60 * 1000;

/** 已連結捷徑時：開啟網頁、切回前景、每 10 分鐘自動抓取雲端資料 */
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { save, today, update, notify } = useGame();
  const [state, setState] = useState<SyncState>('idle');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const linked = !!save.cloud?.linked && isCloudConfigured();

  const syncNow = useCallback(
    async (opts: { quiet?: boolean } = {}) => {
      if (!isCloudConfigured() || busy.current) return;
      busy.current = true;
      setState('syncing');
      try {
        const { daily, workouts } = await fetchHealth(addDays(today, -8));
        update((s) => applyCloudHealth(s, daily, workouts));
        setState('ok');
        setMessage(daily.length ? `已取得 ${daily.length} 天的步數資料` : '雲端還沒有捷徑送來的資料');
        if (!opts.quiet) notify('靈脈已同步', daily.length ? '步數與運動已更新' : '尚未收到捷徑資料');
      } catch (e) {
        setState('error');
        setMessage(e instanceof Error ? e.message : '同步失敗');
        if (!opts.quiet) notify('同步失敗', e instanceof Error ? e.message : undefined);
      } finally {
        busy.current = false;
      }
    },
    [today, update, notify],
  );

  useEffect(() => {
    if (!linked) return;
    void syncNow({ quiet: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    const t = window.setInterval(() => void syncNow({ quiet: true }), AUTO_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(t);
    };
  }, [linked, syncNow]);

  return <CloudContext.Provider value={{ state, message, syncNow }}>{children}</CloudContext.Provider>;
}

export function useCloudSync(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloudSync 必須在 CloudSyncProvider 裡使用');
  return ctx;
}
