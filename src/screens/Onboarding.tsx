import { useState } from 'react';
import {
  DEFAULT_TIMEZONE,
  DIFFICULTY_LABEL,
  GAME_CONFIG,
  waterGoalFromWeight,
  type Difficulty,
} from '../../packages/game-core/index.ts';
import { CULTIVATORS, Cultivator } from '../components/Cultivator.tsx';
import { Panel } from '../components/ui.tsx';
import { useGame } from '../state/GameContext.tsx';
import { createPlayer } from '../state/game.ts';
import type { AvatarId } from '../state/types.ts';

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  beginner: '凡人體質',
  intermediate: '小有根基',
  advanced: '天生神力',
};

export function Onboarding() {
  const { update } = useGame();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('sword');
  const [weight, setWeight] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');

  const weightKg = weight ? Number(weight) : null;
  const goal = waterGoalFromWeight(weightKg);
  const chosen = CULTIVATORS.find((c) => c.id === avatar)!;

  const finish = () => {
    update((s) =>
      createPlayer(s, {
        name: name.trim() || '無名散修',
        avatar,
        createdAt: new Date().toISOString(),
        weightKg: weightKg && weightKg > 0 ? weightKg : null,
        waterGoalMl: goal,
        cupMl: GAME_CONFIG.water.defaultCupMl,
        difficulty,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE,
        safetyAcknowledged: false,
      }),
    );
  };

  if (step === 0) {
    return (
      <div className="onboarding">
        <div className="awaken">
          <p className="system-tag">【天道感應】</p>
          <h1 className="awaken-title">汝身具靈根，可入仙途。</h1>
          <div className="awaken-figure">
            <Cultivator id="sword" realm="qi" size={150} />
          </div>
          <p>凡間一飲一啄、一步一息，皆是修行。</p>
          <p>飲靈泉、踏雲行、苦修淬體，便能積累修為，自練氣一路突破，直至飛升。</p>
          <p className="muted">懈怠不受天譴，只是道行停滯。</p>
          <button className="btn btn-primary btn-block" onClick={() => setStep(1)}>
            踏入仙途
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <Panel title="立下道號">
        <div className="choose-preview">
          <Cultivator id={avatar} realm="foundation" size={150} />
          <div>
            <div className="choose-name">{chosen.name}</div>
            <div className="muted">{chosen.intro}</div>
            <div className="hint">築基後顯現本命法寶</div>
          </div>
        </div>

        <div className="avatar-grid">
          {CULTIVATORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`avatar-choice ${avatar === c.id ? 'selected' : ''}`}
              onClick={() => setAvatar(c.id)}
              aria-pressed={avatar === c.id}
            >
              <Cultivator id={c.id} realm="qi" size={60} animate={false} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <label className="field">
          <span>道號</span>
          <input value={name} maxLength={12} placeholder="例如：青雲子" onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          <span>體重（公斤，選填，用來推算每日飲用靈泉之量）</span>
          <input inputMode="decimal" value={weight} placeholder="可略過" onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))} />
          <small>每日飲水目標：{goal.toLocaleString()} ml</small>
        </label>

        <div className="field">
          <span>淬體功法難度</span>
          <div className="segmented">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button key={d} type="button" className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)}>
                {DIFFICULTY_LABEL[d]}
                <small>{DIFFICULTY_HINT[d]}</small>
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={finish}>
          開始修煉
        </button>
        <p className="hint">資料目前只存在這支手機的瀏覽器中，之後的版本會加入登入與雲端同步。</p>
      </Panel>
    </div>
  );
}
