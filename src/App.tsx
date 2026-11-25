import { useEffect, useState, type ReactNode } from 'react';
import { levelInfo } from '../packages/game-core/index.ts';
import { Breakthrough } from './components/Breakthrough.tsx';
import { Celebration } from './components/Celebration.tsx';
import {
  claimableMilestones,
  clearPathNotice,
  markCelebrated,
  pathProgress,
  plotReadyAt,
  settlePath,
  shouldCelebrate,
} from './state/cultivation.ts';
import { getInv } from './state/inventory.ts';
import { Path } from './screens/Path.tsx';
import { CloudSyncProvider } from './cloud/CloudSync.tsx';
import { GameProvider, useGame } from './state/GameContext.tsx';
import { claimableCount, markLevelSeen, streakOn, totalXp } from './state/game.ts';
import { History } from './screens/History.tsx';
import { Onboarding } from './screens/Onboarding.tsx';
import { Quests } from './screens/Quests.tsx';
import { Settings } from './screens/Settings.tsx';
import { Status } from './screens/Status.tsx';
import { Workout } from './screens/Workout.tsx';
import { WalkSession } from './gps/WalkSession.tsx';

type Tab = 'status' | 'quests' | 'path' | 'history' | 'settings';

const ICONS: Record<Tab, ReactNode> = {
  status: <path d="M2 20l6.5-11 4 6 3-4.5L22 20zM17.5 4.5a2 2 0 1 0 0 .01" />,
  quests: <path d="M6 3h12v18l-6-4-6 4z" />,
  path: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a4.5 4.5 0 0 1 0 9a4.5 4.5 0 0 0 0 9" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="12" cy="16.5" r="1" />
    </>
  ),
  history: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
};

const LABELS: Record<Tab, string> = { status: '洞府', quests: '任務', path: '修行', history: '紀錄', settings: '設定' };

function LevelUpOverlay() {
  const { save, update } = useGame();
  const info = levelInfo(totalXp(save));
  if (info.level <= save.lastSeenLevel || !save.player) return null;
  return (
    <Breakthrough
      avatar={save.player.avatar}
      fromLevel={save.lastSeenLevel}
      toLevel={info.level}
      onDone={() => update(markLevelSeen)}
    />
  );
}

/** 今日功課圓滿時的慶祝（升級動畫優先） */
function CelebrationOverlay() {
  const { save, today, update } = useGame();
  if (!save.player || !shouldCelebrate(save, today)) return null;
  if (levelInfo(totalXp(save)).level > save.lastSeenLevel) return null;
  const p = pathProgress(save, today);
  return (
    <Celebration
      dayNo={p?.completed ?? 0}
      streak={streakOn(save, today)}
      hasPath={!!p}
      onDone={() => update((s) => markCelebrated(s, today))}
    />
  );
}

/** 逆天模式結算與通知 */
function PathKeeper() {
  const { save, today, update, notify } = useGame();
  const hard = save.path?.hard;
  useEffect(() => {
    if (hard) update((s) => settlePath(s, today));
  }, [hard, today, update]);
  const notice = save.path?.notice;
  useEffect(() => {
    if (!notice) return;
    notify('【天道示警】', notice);
    update(clearPathNotice);
  }, [notice, notify, update]);
  return null;
}

function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <strong>{t.title}</strong>
          {t.body && <span>{t.body}</span>}
        </div>
      ))}
    </div>
  );
}

function Shell() {
  const { save, today } = useGame();
  const [tab, setTabState] = useState<Tab>('status');
  // 切換分頁時回到頂端
  const setTab = (t: Tab) => {
    setTabState(t);
    window.scrollTo(0, 0);
  };
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);

  if (!save.player) {
    return (
      <>
        <Onboarding />
        <Toasts />
      </>
    );
  }

  const badge = claimableCount(save, today);
  const inv = getInv(save);
  const nowMs = Date.now();
  const pathBadge =
    claimableMilestones(save, today).length +
    (inv.expedition && Date.parse(inv.expedition.end) <= nowMs ? 1 : 0) +
    inv.plots.filter((p) => p && plotReadyAt(p) <= nowMs).length;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">我運動，我升級<small>修仙錄</small></span>
        <span className="muted mono">{today}</span>
      </header>
      <main>
        {tab === 'status' && (
          <Status
            onOpenWorkout={() => setWorkoutOpen(true)}
            onOpenWalk={() => setWalkOpen(true)}
            onGoQuests={() => setTab('quests')}
            onGoPath={() => setTab('path')}
          />
        )}
        {tab === 'quests' && <Quests />}
        {tab === 'path' && <Path />}
        {tab === 'history' && <History />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="tabbar" aria-label="主選單">
        {(Object.keys(LABELS) as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
              {ICONS[t]}
            </svg>
            <span>{LABELS[t]}</span>
            {t === 'quests' && badge > 0 && <span className="badge">{badge}</span>}
            {t === 'path' && pathBadge > 0 && <span className="badge">{pathBadge}</span>}
          </button>
        ))}
      </nav>
      {workoutOpen && <Workout onClose={() => setWorkoutOpen(false)} />}
      {walkOpen && <WalkSession onClose={() => setWalkOpen(false)} />}
      <LevelUpOverlay />
      <CelebrationOverlay />
      <PathKeeper />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <CloudSyncProvider>
        <Shell />
      </CloudSyncProvider>
    </GameProvider>
  );
}
