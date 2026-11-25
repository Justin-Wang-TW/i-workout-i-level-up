// 形象：Q版／寫意、髮型、髮色、衣色、表情、頭飾、靈寵、場景
import { useState } from 'react';
import { levelInfo } from '../../packages/game-core/index.ts';
import { PlayerFigure, lookOf } from '../components/PlayerFigure.tsx';
import { Scene } from '../components/Scene.tsx';
import {
  COMPANIONS,
  FACES,
  HAIR_COLORS,
  HAIR_COLOR_NAMES,
  HAIR_STYLES,
  ORNAMENTS,
  ROBE_COLORS,
  ROBE_COLOR_NAMES,
  SCENES,
  type Look,
} from '../components/look.ts';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { meetsRealm } from '../state/cultivation.ts';
import { totalXp, updatePlayer } from '../state/game.ts';
import { getInv } from '../state/inventory.ts';

const REALM_NAME: Record<string, string> = {
  qi: '練氣',
  foundation: '築基',
  core: '金丹',
  nascent: '元嬰',
  spirit: '化神',
  tribulation: '渡劫',
  ascension: '飛升',
};

export function LookEditor() {
  const { save, update, notify } = useGame();
  const player = save.player!;
  const saved = lookOf(player);
  const [draft, setDraft] = useState<Look>(saved);
  const realm = levelInfo(totalXp(save)).realm.id;
  const inv = getInv(save);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Look>(k: K, v: Look[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const chibi = draft.style === 'chibi';

  return (
    <>
      <div className="look-preview">
        <Scene id={draft.scene} height={280}>
          <PlayerFigure player={player} look={draft} realm={realm} size={168} gear={inv.equipped} />
        </Scene>
      </div>
      <div className="look-actions">
        <button
          className="btn btn-gold"
          disabled={!dirty}
          onClick={() => {
            update((s) => updatePlayer(s, { look: draft }));
            notify('【形象已更新】', '洞府中的修士已換上新裝');
          }}
        >
          儲存形象
        </button>
        <button className="btn btn-ghost" disabled={!dirty} onClick={() => setDraft(saved)}>
          還原
        </button>
      </div>

      <Panel title="畫風">
        <div className="segmented">
          <button className={chibi ? 'active' : ''} onClick={() => set('style', 'chibi')}>
            Q版
            <small>大頭可愛</small>
          </button>
          <button className={!chibi ? 'active' : ''} onClick={() => set('style', 'classic')}>
            寫意
            <small>原本的修士</small>
          </button>
        </div>
      </Panel>

      {chibi && (
        <Panel title="樣貌">
          <OptionRow label="髮型" items={HAIR_STYLES} value={draft.hair} onPick={(v) => set('hair', v)} />
          <div className="field">
            <span>髮色</span>
            <div className="swatches">
              {HAIR_COLORS.map((c, i) => (
                <button
                  key={c}
                  className={`swatch ${draft.hairColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  aria-label={HAIR_COLOR_NAMES[i]}
                  aria-pressed={draft.hairColor === c}
                  onClick={() => set('hairColor', c)}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <span>衣色</span>
            <div className="swatches">
              {ROBE_COLORS.map((c, i) => (
                <button
                  key={c}
                  className={`swatch ${draft.robe === c ? 'active' : ''}`}
                  style={{ background: c }}
                  aria-label={`${ROBE_COLOR_NAMES[i]}袍`}
                  aria-pressed={draft.robe === c}
                  onClick={() => set('robe', c)}
                />
              ))}
            </div>
          </div>
          <OptionRow label="表情" items={FACES} value={draft.face} onPick={(v) => set('face', v)} />
          <OptionRow label="頭飾" items={ORNAMENTS} value={draft.ornament} onPick={(v) => set('ornament', v)} />
          <OptionRow label="靈寵" items={COMPANIONS} value={draft.companion} onPick={(v) => set('companion', v)} />
          <p className="hint">法寶會疊在造型上；本命法寶（飛劍、丹爐、靈符、金鐘）依修士流派，築基後顯現。</p>
        </Panel>
      )}

      <Panel title="場景" right={<span className="muted">境界越高，解鎖越多</span>}>
        <ul className="scene-list">
          {SCENES.map((sc) => {
            const ok = meetsRealm(save, sc.realm);
            return (
              <li key={sc.id}>
                <button
                  className={`scene-pick ${draft.scene === sc.id ? 'active' : ''}`}
                  disabled={!ok}
                  onClick={() => set('scene', sc.id)}
                  aria-pressed={draft.scene === sc.id}
                >
                  <div className="scene-thumb">
                    <Scene id={sc.id} height={74} />
                  </div>
                  <span>{sc.name}</span>
                  <small className="muted">{ok ? sc.desc : `${REALM_NAME[sc.realm]}解鎖`}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

function OptionRow<T extends string>({
  label,
  items,
  value,
  onPick,
}: {
  label: string;
  items: { id: T; name: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips">
        {items.map((it) => (
          <button key={it.id} className={`chip ${value === it.id ? 'active' : ''}`} aria-pressed={value === it.id} onClick={() => onPick(it.id)}>
            {it.name}
          </button>
        ))}
      </div>
    </div>
  );
}
