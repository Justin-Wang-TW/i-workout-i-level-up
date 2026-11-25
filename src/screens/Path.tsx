// 「修行」分頁：六十六日築基、功法、出門歷練、靈田丹房、法寶
import { useState } from 'react';
import {
  DIFFICULTY_LABEL,
  EXPEDITIONS,
  GEAR,
  GEAR_SLOT_LABEL,
  HARD_MODE_REWARD,
  HERBS,
  PILLS,
  PLAN_DAYS,
  PLAN_MILESTONES,
  PLAN_STAGES,
  ROOTS,
  SKILLS,
  SKILL_TIERS,
  STAMINA_MAX,
  expeditionDurationMs,
  herbById,
  levelInfo,
  planStage,
  skillLevel,
  tipForDay,
  type GearSlot,
  type HerbId,
  type PillId,
} from '../../packages/game-core/index.ts';
import { Cultivator } from '../components/Cultivator.tsx';
import { Panel, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import {
  alchemyRate,
  applyRootResult,
  buyGear,
  buySeed,
  canCraft,
  claimMilestone,
  craftGear,
  hasGearMaterials,
  claimableMilestones,
  collectExpedition,
  craftPill,
  equipGear,
  expeditionBonus,
  harvestPlot,
  meetsRealm,
  pathProgress,
  pillsTakenToday,
  plantSeed,
  plotReadyAt,
  setHardMode,
  skillPoints,
  startExpedition,
  startPath,
  syncPlots,
  takePill,
} from '../state/cultivation.ts';
import { totalXp } from '../state/game.ts';
import { getInv } from '../state/inventory.ts';
import { RestPanel } from './Rest.tsx';
import { RootQuiz } from './RootQuiz.tsx';

type Section = 'path' | 'skills' | 'journey' | 'garden' | 'gear';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'path', label: '築基' },
  { id: 'skills', label: '功法' },
  { id: 'journey', label: '歷練' },
  { id: 'garden', label: '靈田丹房' },
  { id: 'gear', label: '法寶' },
];

export function remaining(ms: number): string {
  if (ms <= 0) return '已完成';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} 時 ${m % 60} 分` : `${m} 分`;
}

function StoneBar() {
  const { save } = useGame();
  const inv = getInv(save);
  return (
    <div className="wallet">
      <span className="wallet-item" title="靈石">
        <i className="gem" aria-hidden="true" />
        靈石 <b className="mono">{inv.stones.toLocaleString()}</b>
      </span>
      <span className="wallet-item" title="精力">
        <i className="bolt" aria-hidden="true" />
        精力 <b className="mono">{inv.stamina}</b>/{STAMINA_MAX}
      </span>
    </div>
  );
}

export function Path({ initial = 'path' }: { initial?: Section }) {
  const [section, setSection] = useState<Section>(initial);
  return (
    <div className="screen">
      <StoneBar />
      <div className="segmented seg-scroll" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {section === 'path' && <PathSection />}
      {section === 'skills' && <SkillsSection />}
      {section === 'journey' && <JourneySection />}
      {section === 'garden' && <GardenSection />}
      {section === 'gear' && <GearSection />}
    </div>
  );
}

// ───────── 築基 ─────────

function PathSection() {
  const { save, today, update, notify } = useGame();
  const [quiz, setQuiz] = useState(false);
  const [confirmHard, setConfirmHard] = useState(false);
  const p = pathProgress(save, today);
  const path = save.path;
  const claimable = claimableMilestones(save, today);
  const root = save.player?.root ? ROOTS[save.player.root] : null;

  if (quiz) {
    return (
      <Panel>
        <RootQuiz
          finishLabel="套用建議"
          onFinish={(r) => {
            update((s) => applyRootResult(s, r.root, r.difficulty));
            notify(`【${ROOTS[r.root].name}】`, `淬體難度設為 ${DIFFICULTY_LABEL[r.difficulty]}`);
            setQuiz(false);
          }}
          onSkip={() => setQuiz(false)}
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel title="六十六日築基" right={path && <span className="muted">第 {path.round} 輪{path.hard ? '・逆天' : ''}</span>}>
        {!path || !p ? (
          <div className="path-empty">
            <p>連續修煉 66 天，讓喝水、走路、運動成為不用想就會做的事。</p>
            <p className="hint">每完成一天功課（喝水達標＋任一運動）道基就前進一日；缺席不會倒退，只是不前進。</p>
            <button className="btn btn-gold btn-block" onClick={() => update((s) => startPath(s, today))}>
              開始築基
            </button>
          </div>
        ) : (
          <>
            <div className="path-head">
              <PathRing value={p.completed} />
              <div>
                <div className="path-stage">
                  {planStage(p.dayNo).name}期・第 <b className="mono">{p.dayNo}</b> 日
                </div>
                <div className="muted">{planStage(p.dayNo).intro}</div>
                <div className={`path-today ${p.todayDone ? 'ok' : ''}`}>
                  {p.todayDone ? '✔ 今日功課已圓滿' : p.pausedToday ? '☯ 閉關中：今日不前進也不算缺席' : '◇ 今日：喝水達標＋任一運動'}
                </div>
              </div>
            </div>
            {!p.finished && <p className="path-tip">今日心法：{tipForDay(p.dayNo)}</p>}
            <PathGrid completed={p.completed} todayDone={p.todayDone} />
            <div className="stage-legend">
              {PLAN_STAGES.map((s) => (
                <span key={s.name}>
                  {s.name} {s.from}–{s.to}
                </span>
              ))}
            </div>
            {p.finished && (
              <div className="path-done">
                <p className="system-tag">【道基圓成】</p>
                <p>六十六日已滿，修煉已成日常。要再閉關一輪嗎？</p>
                <button className="btn btn-gold btn-block" onClick={() => update((s) => startPath(s, today, s.path?.hard))}>
                  再閉關六十六日
                </button>
              </div>
            )}
          </>
        )}
      </Panel>

      {path && (
        <Panel title="里程碑" right={path.hard && <span className="tag">逆天 ×{HARD_MODE_REWARD}</span>}>
          <ul className="milestones">
            {PLAN_MILESTONES.map((m) => {
              const got = path.claimed.includes(m.day);
              const can = claimable.some((c) => c.day === m.day);
              const k = path.hard ? HARD_MODE_REWARD : 1;
              return (
                <li key={m.day} className={got ? 'claimed' : can ? 'ready' : ''}>
                  <span className="ms-day mono">{m.day}</span>
                  <div className="grow">
                    <div>{m.name}</div>
                    <div className="muted mono">
                      修為 +{Math.round(m.xp * k)}・靈石 +{Math.round(m.stones * k)}
                    </div>
                  </div>
                  {got ? (
                    <span className="ok">已領</span>
                  ) : can ? (
                    <button
                      className="btn btn-gold btn-sm"
                      onClick={() => {
                        const r = claimMilestone(save, today, m.day);
                        if (!r.xp) return;
                        update((s) => claimMilestone(s, today, m.day).save);
                        notify(`【${m.name}】`, `修為 +${r.xp}・靈石 +${r.stones}`);
                      }}
                    >
                      領取
                    </button>
                  ) : (
                    <span className="muted">未達</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {path && (
        <Panel title="逆天模式">
          <p className="hint">
            開啟後，任何一天沒完成功課（且沒用休養符）就會「道基崩毀」：築基重頭開始、損失兩成靈石。持有「洗髓丹」時會自動護道一次。里程碑獎勵 ×{HARD_MODE_REWARD}。
          </p>
          {confirmHard ? (
            <div className="form-row">
              <button
                className="btn btn-danger"
                onClick={() => {
                  update((s) => setHardMode(s, true, today));
                  setConfirmHard(false);
                  notify('【逆天模式】', '從今天起，缺一日便重頭');
                }}
              >
                確定開啟
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmHard(false)}>
                再想想
              </button>
            </div>
          ) : path.hard ? (
            <button className="btn btn-ghost btn-block" onClick={() => update((s) => setHardMode(s, false, today))}>
              關閉逆天模式
            </button>
          ) : (
            <button className="btn btn-primary btn-block" onClick={() => setConfirmHard(true)}>
              開啟逆天模式
            </button>
          )}
        </Panel>
      )}

      <RestPanel />

      <Panel title="靈根">
        {root ? (
          <div className="root-card">
            <div className="root-orb sm" style={{ ['--root' as string]: root.color }} aria-hidden="true">
              <span>{root.name.slice(0, 1)}</span>
            </div>
            <div>
              <div style={{ color: root.color }}>{root.name}</div>
              <div className="muted">{root.blindSpot}</div>
            </div>
          </div>
        ) : (
          <p className="hint">還沒測過靈根。回答五個問題，得到你的長處、盲點與起步建議。</p>
        )}
        <button className="btn btn-ghost btn-block" onClick={() => setQuiz(true)}>
          {root ? '重新測靈根' : '測靈根'}
        </button>
      </Panel>
    </>
  );
}

function PathRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / PLAN_DAYS);
  return (
    <svg className="path-ring" width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={`築基 ${value} / ${PLAN_DAYS}`}>
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 46 46)"
      />
      <text x="46" y="44" textAnchor="middle" fontSize="20" fill="var(--text)" className="mono">
        {value}
      </text>
      <text x="46" y="60" textAnchor="middle" fontSize="10" fill="var(--muted)">
        / {PLAN_DAYS}
      </text>
    </svg>
  );
}

/** 66 格路線圖：已完成、今天、未來 */
function PathGrid({ completed, todayDone }: { completed: number; todayDone: boolean }) {
  const current = todayDone ? completed : completed + 1;
  return (
    <ol className="path-grid" aria-label="築基路線圖">
      {Array.from({ length: PLAN_DAYS }, (_, i) => {
        const n = i + 1;
        const milestone = PLAN_MILESTONES.some((m) => m.day === n);
        const cls = n <= completed ? 'done' : n === current ? 'now' : '';
        return (
          <li key={n} className={`${cls} ${milestone ? 'ms' : ''} st-${planStage(n).name}`} title={`第 ${n} 日`}>
            {milestone ? n : ''}
          </li>
        );
      })}
    </ol>
  );
}

// ───────── 功法 ─────────

function SkillsSection() {
  const { save } = useGame();
  const pts = skillPoints(save);
  return (
    <Panel title="功法" right={<span className="muted">日常習慣自動修練</span>}>
      <ul className="skill-list">
        {SKILLS.map((s) => {
          const lv = skillLevel(pts[s.id]);
          return (
            <li key={s.id}>
              <div className="skill-top">
                <span className="skill-name">{s.name}</span>
                <span className={`skill-tier ${lv.level > 0 ? 'on' : ''}`}>{SKILL_TIERS[lv.level]}</span>
              </div>
              <div className="muted skill-desc">
                修練：{s.trains}・{s.effect}
              </div>
              {lv.need > 0 ? (
                <>
                  <ProgressBar value={lv.into} max={lv.need} tone="jade" />
                  <div className="quest-progress mono">
                    {lv.into} / {lv.need}
                  </div>
                </>
              ) : (
                <div className="ok">已臻圓滿</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ───────── 歷練 ─────────

function JourneySection() {
  const { save, update, notify } = useGame();
  const nowMs = Date.now();
  const inv = getInv(save);
  const ex = inv.expedition;
  const bonus = expeditionBonus(save);
  const active = ex ? EXPEDITIONS.find((e) => e.id === ex.id) : null;

  return (
    <>
      <Panel title="出門歷練" right={<span className="muted">關掉 App 也會繼續</span>}>
        {ex && active ? (
          <div className="journey-active">
            <Cultivator id={save.player!.avatar} realm={levelInfo(totalXp(save)).realm.id} size={84} gear={inv.equipped} />
            <div className="grow">
              <div>
                正在 <b>{active.name}</b> 歷練
              </div>
              <ProgressBar
                value={nowMs - Date.parse(ex.start)}
                max={Date.parse(ex.end) - Date.parse(ex.start)}
                tone="gold"
              />
              <div className="muted mono">{Date.parse(ex.end) <= nowMs ? '已歸來' : `剩 ${remaining(Date.parse(ex.end) - nowMs)}`}</div>
              <button
                className="btn btn-gold btn-sm"
                disabled={Date.parse(ex.end) > nowMs}
                onClick={() => {
                  const r = collectExpedition(save, new Date());
                  if (!r.story) return;
                  update((s) => collectExpedition(s, new Date()).save);
                  notify('【歷練歸來】', r.story);
                }}
              >
                清點戰利品
              </button>
            </div>
          </div>
        ) : (
          <p className="hint">領取每日功課可得精力。選一處地方出發，時間到回來清點戰利品：靈石、靈草與種子。</p>
        )}
        <p className="hint">
          目前加成：靈石 +{bonus.stonesPct}%・時間 −{Math.min(50, bonus.speedPct)}%{bonus.extraHerbs ? `・靈草 +${bonus.extraHerbs}` : ''}
        </p>
      </Panel>

      <ul className="journey-list">
        {EXPEDITIONS.map((e) => {
          const ok = meetsRealm(save, e.realm);
          const dur = expeditionDurationMs(e, bonus.speedPct);
          return (
            <li key={e.id} className={`panel journey ${ok ? '' : 'locked'}`}>
              <div className="grow">
                <div className="journey-name">{e.name}</div>
                <div className="muted">
                  {remaining(dur)}・精力 {e.stamina}・靈石 {e.stones[0]}–{e.stones[1]}
                </div>
                <div className="muted">靈草：{e.herbs.map((h) => herbById(h).name).join('、')}</div>
              </div>
              {ok ? (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!!ex || inv.stamina < e.stamina}
                  onClick={() => {
                    const r = startExpedition(save, e.id, new Date());
                    if (r.error) return notify('無法出發', r.error);
                    update((s) => startExpedition(s, e.id, new Date()).save);
                    notify(`啟程前往${e.name}`, `約 ${remaining(dur)} 後歸來`);
                  }}
                >
                  出發
                </button>
              ) : (
                <span className="muted">{e.realm === 'foundation' ? '築基' : e.realm === 'core' ? '金丹' : '元嬰'}可入</span>
              )}
            </li>
          );
        })}
      </ul>

      {inv.log.length > 0 && (
        <Panel title="修行紀事">
          <ul className="log-list">
            {inv.log.slice(0, 8).map((l) => (
              <li key={l.at + l.text}>
                <span className="muted mono">{l.at.slice(5, 10).replace('-', '/')}</span> {l.text}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

// ───────── 靈田丹房 ─────────

function GardenSection() {
  const { save, today, update, notify } = useGame();
  const synced = syncPlots(save);
  const inv = getInv(synced);
  const nowMs = Date.now();
  const [picking, setPicking] = useState<number | null>(null);
  const rate = alchemyRate(save);
  const pillTaken = pillsTakenToday(save, today) > 0;

  const plant = (plot: number, herb: HerbId) => {
    const r = plantSeed(save, plot, herb, new Date());
    if (r.error) return notify('無法種植', r.error);
    update((s) => plantSeed(s, plot, herb, new Date()).save);
    setPicking(null);
  };

  return (
    <>
      <Panel title="靈田" right={<span className="muted">{inv.plots.length} 畝</span>}>
        <div className="plots">
          {inv.plots.map((p, i) => {
            if (!p) {
              return (
                <div key={i} className="plot empty">
                  {picking === i ? (
                    <div className="seed-pick">
                      {HERBS.map((h) => (
                        <button key={h.id} className="btn btn-sm" disabled={(inv.seeds[h.id] ?? 0) <= 0} onClick={() => plant(i, h.id)}>
                          {h.name}×{inv.seeds[h.id] ?? 0}
                        </button>
                      ))}
                      <button className="btn btn-ghost btn-sm" onClick={() => setPicking(null)}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button className="plot-btn" onClick={() => setPicking(i)}>
                      ＋ 播種
                    </button>
                  )}
                </div>
              );
            }
            const h = herbById(p.herb);
            const ready = plotReadyAt(p) <= nowMs;
            const pct = Math.min(1, (nowMs - Date.parse(p.plantedAt)) / (h.growHours * 3_600_000));
            return (
              <div key={i} className={`plot ${ready ? 'ready' : ''}`}>
                <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
                  <path d="M20 36 L20 18" stroke="#6fbf8a" strokeWidth="2" />
                  <path d={`M20 ${28 - pct * 6} q-8 -2 -10 -8 q8 0 10 8 M20 ${24 - pct * 6} q8 -2 10 -8 q-8 0 -10 8`} fill="#6fbf8a" />
                  {pct > 0.5 && <circle cx="20" cy={14 - pct * 4} r={2 + pct * 3} fill={h.color} />}
                </svg>
                <div className="plot-name">{h.name}</div>
                {ready ? (
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => {
                      const r = harvestPlot(save, i, new Date());
                      if (!r.amount) return;
                      update(() => r.save);
                      notify('收成', `${h.name} ×${r.amount}`);
                    }}
                  >
                    收成
                  </button>
                ) : (
                  <span className="muted mono">{remaining(plotReadyAt(p) - nowMs)}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="seed-shop">
          {HERBS.map((h) => (
            <button
              key={h.id}
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const r = buySeed(save, h.id);
                if (r.error) return notify('無法購買', r.error);
                update((s) => buySeed(s, h.id).save);
              }}
            >
              買{h.name}種子・{h.seedPrice} 石
            </button>
          ))}
        </div>
        <p className="hint">
          庫存：
          {HERBS.map((h) => `${h.name} ${inv.herbs[h.id] ?? 0}`).join('・')}
        </p>
      </Panel>

      <Panel title="丹房" right={<span className="muted">成功率 {rate}%</span>}>
        <ul className="pill-list">
          {PILLS.map((pill) => {
            const have = inv.pills[pill.id] ?? 0;
            return (
              <li key={pill.id}>
                <div className="grow">
                  <div>
                    {pill.name} <span className="muted">持有 {have}</span>
                  </div>
                  <div className="muted">
                    {Object.entries(pill.recipe)
                      .map(([h, n]) => `${herbById(h as HerbId).name}×${n}`)
                      .join(' + ')}
                    ・{pill.effect}
                  </div>
                </div>
                <div className="pill-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!canCraft(save, pill.id)}
                    onClick={() => {
                      const r = craftPill(save, pill.id);
                      update(() => r.save);
                      notify(r.ok ? '【丹成】' : '【炸爐】', r.ok ? `煉成${pill.name}` : '靈草化為飛灰，下次再試');
                    }}
                  >
                    煉製
                  </button>
                  {pill.id !== 'marrow_pill' && (
                    <button
                      className="btn btn-gold btn-sm"
                      disabled={have <= 0 || pillTaken}
                      onClick={() => {
                        const r = takePill(save, today, pill.id as PillId);
                        if (r.error) return notify('無法服用', r.error);
                        update(() => r.save);
                        notify(`服下${pill.name}`, pill.effect);
                      }}
                    >
                      服用
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hint">每天最多服用一顆丹藥。修為主要還是來自真實的修煉。</p>
      </Panel>
    </>
  );
}

// ───────── 法寶 ─────────

function GearSection() {
  const { save, update, notify } = useGame();
  const inv = getInv(save);
  const realm = levelInfo(totalXp(save)).realm.id;
  const slots = Object.keys(GEAR_SLOT_LABEL) as GearSlot[];
  return (
    <>
      <Panel title="法寶" right={<span className="muted">穿戴後顯示在修士身上</span>}>
        <div className="gear-preview">
          <Cultivator id={save.player!.avatar} realm={realm} size={150} gear={inv.equipped} />
          <ul className="gear-slots">
            {slots.map((slot) => {
              const g = GEAR.find((x) => x.id === inv.equipped[slot]);
              return (
                <li key={slot}>
                  <span className="muted">{GEAR_SLOT_LABEL[slot]}</span>
                  <span style={{ color: g?.color }}>{g ? g.name : '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
      <ul className="gear-list">
        {GEAR.map((g) => {
          const owned = inv.gear.includes(g.id);
          const on = inv.equipped[g.slot] === g.id;
          const ok = meetsRealm(save, g.realm);
          return (
            <li key={g.id} className={`panel gear-item ${ok ? '' : 'locked'}`}>
              <span className="gear-dot" style={{ background: g.color }} aria-hidden="true" />
              <div className="grow">
                <div>
                  {g.name} <span className="muted">・{GEAR_SLOT_LABEL[g.slot]}</span>
                </div>
                <div className="muted">{g.desc}</div>
                {g.recipe && !owned && (
                  <div className="gear-recipe">
                    煉器材料：
                    {Object.entries(g.recipe)
                      .map(([h, n]) => `${herbById(h as HerbId).name}×${n}`)
                      .join('、')}
                    ＋靈石 {g.price}
                  </div>
                )}
              </div>
              {owned ? (
                <button className="btn btn-sm btn-ghost" onClick={() => update((s) => equipGear(s, g.slot, on ? null : g.id))}>
                  {on ? '卸下' : '裝備'}
                </button>
              ) : ok && g.recipe ? (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!hasGearMaterials(save, g.id)}
                  onClick={() => {
                    const r = craftGear(save, g.id);
                    if (r.error) return notify('無法煉器', r.error);
                    update((s) => craftGear(s, g.id).save);
                    notify(`【煉器成功】${g.name}`, g.desc);
                  }}
                >
                  煉器
                </button>
              ) : ok ? (
                <button
                  className="btn btn-sm btn-gold"
                  disabled={inv.stones < g.price}
                  onClick={() => {
                    const r = buyGear(save, g.id);
                    if (r.error) return notify('無法購買', r.error);
                    update((s) => buyGear(s, g.id).save);
                    notify(`得到法寶「${g.name}」`, g.desc);
                  }}
                >
                  {g.price} 石
                </button>
              ) : (
                <span className="muted">境界不足</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

