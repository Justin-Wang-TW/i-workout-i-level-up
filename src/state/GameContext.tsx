import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_TIMEZONE, dayKeyOf, type DayKey } from '../../packages/game-core/index.ts';
import { loadSave, persistSave } from './game.ts';
import type { SaveData } from './types.ts';

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface GameContextValue {
  save: SaveData;
  today: DayKey;
  /** 目前時間（每 30 秒更新） */
  now: Date;
  /** 以純函式更新存檔，例如 update((s) => addCup(s, today, 250)) */
  update: (fn: (s: SaveData) => SaveData) => void;
  replace: (s: SaveData) => void;
  toasts: Toast[];
  notify: (title: string, body?: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 每 30 秒更新時間，跨過午夜時自動換日
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    const onVisible = () => setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    persistSave(save);
  }, [save]);

  const today = dayKeyOf(now, save.player?.timeZone ?? DEFAULT_TIMEZONE);

  const update = useCallback((fn: (s: SaveData) => SaveData) => setSave((s) => fn(s)), []);
  const replace = useCallback((s: SaveData) => setSave(s), []);

  const notify = useCallback((title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, title, body }].slice(-2));
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600);
  }, []);

  const value = useMemo(
    () => ({ save, today, now, update, replace, toasts, notify }),
    [save, today, now, update, replace, toasts, notify],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame 必須在 GameProvider 裡使用');
  return ctx;
}
