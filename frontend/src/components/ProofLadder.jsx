import { IconAlert, IconCheck, IconClock } from './Icons';

const STATUS_ICON = { done: IconCheck, warning: IconAlert, todo: IconClock };

/** The four proof steps. `actions` maps a step key to extra content shown under it (owner page only). */
export default function ProofLadder({ ladder, actions = {} }) {
  return (
    <div className="proof-ladder">
      <div className="proof-level">
        <span className={`proof-level-badge level-${ladder.level}`}>{ladder.level}<small>/4</small></span>
        <div>
          <strong>{ladder.label} proof of authorship</strong>
          <p className="muted small">A registration proves when a file existed, not who made it. Each step below adds evidence of who did.</p>
        </div>
      </div>
      {ladder.warnings.map((w) => <div key={w} className="alert alert-warn"><IconAlert /> {w}</div>)}
      <ol className="proof-steps">
        {ladder.steps.map((s, i) => {
          const Ico = STATUS_ICON[s.status] || IconClock;
          return (
            <li key={s.key} className={`proof-step ${s.status}`}>
              <span className="proof-step-icon"><Ico size={15} /></span>
              <div className="proof-step-body">
                <strong>{i + 1}. {s.title}</strong>
                <p>{s.detail}</p>
                {s.supporting?.map((t) => <p key={t} className="muted small">{t}</p>)}
                {actions[s.key]}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
