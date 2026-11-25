// 測靈根：五道問心題 → 靈根、長處與盲點、起步建議
import { useState } from 'react';
import {
  DIFFICULTY_LABEL,
  ROOTS,
  ROOT_QUIZ,
  scoreRootQuiz,
  type QuizResult,
} from '../../packages/game-core/index.ts';

export function RootQuiz({
  onFinish,
  onSkip,
  finishLabel = '依此起步',
}: {
  onFinish: (r: QuizResult) => void;
  onSkip?: () => void;
  finishLabel?: string;
}) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length;
  const done = step >= ROOT_QUIZ.length;
  const result = done ? scoreRootQuiz(answers) : null;

  if (result) {
    const root = ROOTS[result.root];
    return (
      <div className="quiz">
        <p className="system-tag">【測靈根・結果】</p>
        <div className="root-orb" style={{ ['--root' as string]: root.color }} aria-hidden="true">
          <span>{root.name.slice(0, 1)}</span>
        </div>
        <h2 className="quiz-root" style={{ color: root.color }}>
          {root.name}
        </h2>
        <div className="quiz-block">
          <h3>長處</h3>
          <p>{root.strength}</p>
        </div>
        <div className="quiz-block">
          <h3>盲點</h3>
          <p>{root.blindSpot}</p>
        </div>
        <div className="quiz-block">
          <h3>起步心法</h3>
          <ul>
            {root.focus.map((f) => (
              <li key={f}>{f}</li>
            ))}
            <li>淬體難度：{DIFFICULTY_LABEL[result.difficulty]}</li>
          </ul>
          <p className="hint">{result.advice}</p>
        </div>
        <button className="btn btn-gold btn-block" onClick={() => onFinish(result)}>
          {finishLabel}
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => setAnswers([])}>
          重新測驗
        </button>
      </div>
    );
  }

  const q = ROOT_QUIZ[step];
  return (
    <div className="quiz">
      <p className="system-tag">【測靈根】第 {step + 1} / {ROOT_QUIZ.length} 問</p>
      <div className="quiz-dots" aria-hidden="true">
        {ROOT_QUIZ.map((_, i) => (
          <span key={i} className={i < step ? 'on' : i === step ? 'cur' : ''} />
        ))}
      </div>
      <h2 className="quiz-q">{q.question}</h2>
      <div className="quiz-options">
        {q.options.map((o, i) => (
          <button key={o.label} className="btn quiz-opt" onClick={() => setAnswers([...answers, i])}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="quiz-foot">
        {step > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setAnswers(answers.slice(0, -1))}>
            上一題
          </button>
        )}
        {onSkip && (
          <button className="btn btn-ghost btn-sm" onClick={onSkip}>
            略過
          </button>
        )}
      </div>
    </div>
  );
}
