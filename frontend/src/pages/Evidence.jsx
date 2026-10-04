import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, mediaUrl, certificateUrl, verifyPath, API_BASE } from '../api/client';
import ScoreRing from '../components/ScoreRing';
import { useToast } from '../components/Toast';
import { IconArrowLeft, IconAlert, IconDownload, IconShield, IconCopy, IconFingerprint, IconSparkle } from '../components/Icons';
import { verdictMeta, pct, formatDate } from '../lib/format';

const hexToBits = (hex) =>
  hex.split('').flatMap((h) => parseInt(h, 16).toString(2).padStart(4, '0').split('').map(Number));

/** Plain-language reading of the two scores. */
function explain(p, e) {
  if (e >= 0.9 && p >= 0.85) return 'Near-identical. Both the pixel structure and the content match, which is typical of a direct repost, resize or recompression.';
  if (e >= 0.85 && p < 0.75) return 'Same content, altered pixels. The AI embedding recognises the subject and composition, but the pixel structure changed. That pattern fits cropping, rotation, flipping, colour filters or an AI re-render.';
  if (e >= 0.85) return 'Strong match on both signals with some editing, such as colour or contrast changes, light cropping or compression.';
  if (e >= 0.7) return 'Related imagery. The subject and composition are similar, but not enough to say it is the same work. It may be a heavy edit or a different image of the same scene.';
  return 'Weak similarity. The images share some visual features, but this is unlikely to be a copy.';
}

function HashGrid({ a, b }) {
  const A = hexToBits(a), B = hexToBits(b);
  const diff = A.filter((bit, i) => bit !== B[i]).length;
  const grid = (bits, other) => (
    <div className="bit-grid">
      {bits.map((bit, i) => <span key={i} className={`${bit ? 'on' : ''} ${bit !== other[i] ? 'diff' : ''}`} />)}
    </div>
  );
  return (
    <div className="hash-compare">
      <div><small>Suspected copy</small>{grid(A, B)}<code>{a}</code></div>
      <div><small>Registered original</small>{grid(B, A)}<code>{b}</code></div>
      <p className="muted small"><strong>{diff} of 64 bits differ</strong> (Hamming distance). Outlined cells are the bits that changed.</p>
    </div>
  );
}

function CompareView({ copy, original }) {
  const [mode, setMode] = useState('side');
  const [pos, setPos] = useState(50);
  return (
    <div className="compare panel">
      <div className="compare-head">
        <div className="segmented">
          <button className={mode === 'side' ? 'active' : ''} onClick={() => setMode('side')}>Side by side</button>
          <button className={mode === 'slider' ? 'active' : ''} onClick={() => setMode('slider')}>Overlay slider</button>
        </div>
      </div>
      {mode === 'side' ? (
        <div className="compare-side">
          <figure><div className="frame"><img src={copy} alt="Suspected copy" /></div><figcaption>Suspected copy</figcaption></figure>
          <figure><div className="frame"><img src={original} alt="Registered original" /></div><figcaption>Registered original</figcaption></figure>
        </div>
      ) : (
        <div className="compare-slider">
          <img src={original} alt="Registered original" />
          <img src={copy} alt="Suspected copy" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          <span className="slider-line" style={{ left: `${pos}%` }} />
          <span className="slider-tag left">Copy</span><span className="slider-tag right">Original</span>
          <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Reveal" />
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color, children }) {
  return (
    <div className="score-bar">
      <div className="sb-head"><strong>{label}</strong><span>{pct(value)}</span></div>
      <div className="sb-track"><span style={{ width: `${Math.max(0, value) * 100}%`, background: color }} /></div>
      <p className="muted small">{children}</p>
    </div>
  );
}

export default function Evidence() {
  const { checkId, matchWorkId } = useParams();
  const toast = useToast();
  const [check, setCheck] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient(`/api/checks/${checkId}`).then(setCheck).catch((err) => setError(err.message));
  }, [checkId]);

  const match = useMemo(() => check?.results.find((r) => r.work_id === matchWorkId), [check, matchWorkId]);

  if (error) return <div className="empty-state"><span className="empty-icon error"><IconAlert size={28} /></span><h3>Evidence not found</h3><p>{error}</p><Link className="btn btn-ghost" to="/check">Back to check</Link></div>;
  if (!check) return <div className="full-loader inline"><span className="spinner" /></div>;
  if (!match) return <div className="empty-state"><h3>This match isn't part of that check</h3><Link className="btn btn-ghost" to={`/check/${checkId}`}>Back to results</Link></div>;

  const meta = verdictMeta(match.verdict);
  const verifyLink = `${window.location.origin}${verifyPath(match.work_id)}`;

  const summary = [
    'IMAGE SIMILARITY EVIDENCE',
    `Registered work: "${match.title}" by ${match.owner_name}`,
    `Registered on: ${formatDate(match.registered_at, { dateStyle: 'long', timeStyle: 'long' })}`,
    `Registry hash: ${match.entry_hash}`,
    `Public record: ${verifyLink}`,
    '',
    `Suspected copy checked: ${formatDate(check.created_at, { dateStyle: 'long', timeStyle: 'long' })}`,
    `Verdict: ${meta.label} (${pct(match.confidence)} confidence)`,
    `Perceptual hash similarity: ${pct(match.phash_score)}`,
    `AI embedding similarity: ${pct(match.embedding_score)}`,
    `Assessment: ${explain(match.phash_score, match.embedding_score)}`,
  ].join('\n');

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast('Evidence summary copied. Paste it into a takedown request.');
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <div className="page-enter evidence">
      <Link to={`/check/${checkId}`} className="back-link"><IconArrowLeft size={15} /> Back to results</Link>

      <header className={`evidence-head tone-${meta.tone}`}>
        <ScoreRing value={match.confidence} verdict={match.verdict} size={92} stroke={8} />
        <div>
          <span className={`chip tone-chip tone-${meta.tone}`}>{meta.label}</span>
          <h1 className="page-title">“{match.title}”</h1>
          <p className="muted">
            {match.is_own ? 'Your registered work' : `Registered by ${match.owner_name}`} · {formatDate(match.registered_at)}
          </p>
        </div>
        <div className="evidence-actions">
          <button className="btn btn-primary" onClick={copySummary}><IconCopy size={16} /> Copy evidence summary</button>
          <a className="btn btn-ghost" href={certificateUrl(match.work_id)} target="_blank" rel="noreferrer"><IconDownload size={16} /> Certificate</a>
        </div>
      </header>

      <div className="evidence-grid">
        <CompareView copy={mediaUrl(check.query_image_url)} original={mediaUrl(match.image_url)} />

        <aside className="evidence-side">
          <section className="panel">
            <h3 className="panel-title"><IconSparkle size={16} /> Why this was flagged</h3>
            <p className="explain">{explain(match.phash_score, match.embedding_score)}</p>
            <ScoreBar label="AI embedding" value={match.embedding_score} color="var(--brand)">
              Compares what the image shows (subject, composition, style) using a CLIP vision model.
            </ScoreBar>
            <ScoreBar label="Perceptual hash" value={match.phash_score} color="#3b9be0">
              Compares the coarse pixel structure. It drops quickly after crops, rotations and flips.
            </ScoreBar>
            <ScoreBar label="Combined confidence" value={match.confidence} color="var(--grad)">
              Weighted toward the embedding, so edits that only break the hash still get caught.
            </ScoreBar>
          </section>

          <section className="panel">
            <h3 className="panel-title"><IconFingerprint size={16} /> Perceptual hash comparison</h3>
            <HashGrid a={check.query_phash} b={match.work_phash} />
          </section>

          <section className="panel">
            <h3 className="panel-title"><IconShield size={16} /> Proof of prior registration</h3>
            <p className="muted small">The original was in the registry before this check. Its record and Bitcoin timestamp can be verified independently.</p>
            <div className="hash-value static"><code>{match.entry_hash}</code></div>
            <div className="action-row">
              <Link className="btn btn-ghost" to={verifyPath(match.work_id)}>Open public record</Link>
              <a className="btn btn-ghost" href={`${API_BASE}/api/public/works/${match.work_id}/record.json`}>record.json</a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
