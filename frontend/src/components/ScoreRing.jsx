import { verdictMeta } from '../lib/format';

/** Circular confidence gauge coloured by verdict. */
export default function ScoreRing({ value, verdict, size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = verdictMeta(verdict).tone;
  return (
    <div className={`score-ring tone-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="track" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="value"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span style={{ fontSize: size * 0.24 }}>{Math.floor(value * 100)}<small>%</small></span>
    </div>
  );
}
