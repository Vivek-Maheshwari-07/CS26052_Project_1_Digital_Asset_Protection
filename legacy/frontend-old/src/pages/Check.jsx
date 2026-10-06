import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient, mediaUrl } from '../api/client';
import Dropzone from '../components/Dropzone';
import ScoreRing from '../components/ScoreRing';
import { IconScan, IconAlert, IconArrowRight, IconShield, IconCheck, IconArrowLeft } from '../components/Icons';
import { verdictMeta, pct, formatDate, relativeTime } from '../lib/format';

function Summary({ check }) {
  const top = check.results[0];
  const meta = verdictMeta(check.top_verdict);
  if (!top || check.top_verdict === 'no_match') {
    return (
      <div className="verdict-banner tone-ok">
        <span className="vb-icon"><IconCheck size={22} /></span>
        <div>
          <strong>No registered work matches this image</strong>
          <p>The closest entry scored {top ? pct(top.confidence) : '0%'}, below the match threshold.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`verdict-banner tone-${meta.tone}`}>
      <span className="vb-icon"><IconAlert size={22} /></span>
      <div>
        <strong>{meta.label} of “{top.title}”{top.is_own ? ' (your work)' : ` by ${top.owner_name}`}</strong>
        <p>{pct(top.confidence)} confidence. Registered {formatDate(top.registered_at)}.</p>
      </div>
      <Link className="btn btn-primary" to={`/evidence/${check.id}/${top.work_id}`}>
        View evidence <IconArrowRight size={16} />
      </Link>
    </div>
  );
}

function MatchCard({ match, checkId, rank }) {
  const meta = verdictMeta(match.verdict);
  return (
    <Link to={`/evidence/${checkId}/${match.work_id}`} className="match-row" style={{ animationDelay: `${rank * 50}ms` }}>
      <span className="match-rank">{rank + 1}</span>
      <div className="match-thumb">{match.image_url && <img src={mediaUrl(match.image_url)} alt="" loading="lazy" />}</div>
      <div className="match-info">
        <strong>{match.title}</strong>
        <span className="muted small">
          {match.is_own ? <span className="chip chip-brand">Your work</span> : `by ${match.owner_name}`}
          {' · '}registered {relativeTime(match.registered_at)}
        </span>
        <div className="mini-bars">
          <span>pHash <b>{pct(match.phash_score, 0)}</b></span>
          <span>Embedding <b>{pct(match.embedding_score, 0)}</b></span>
        </div>
      </div>
      <span className={`chip tone-chip tone-${meta.tone}`}>{meta.label}</span>
      <ScoreRing value={match.confidence} verdict={match.verdict} size={56} />
      <IconArrowRight size={18} className="match-go" />
    </Link>
  );
}

export default function Check() {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState(null);

  // Load a past check from history
  useEffect(() => {
    if (!checkId) { setCheck(null); return; }
    if (check?.id === checkId) return;
    setLoading(true);
    apiClient(`/api/checks/${checkId}`)
      .then(setCheck)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [checkId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scan = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const data = await apiClient('/api/works/check', { method: 'POST', body: formData });
      setCheck(data);
      navigate(`/check/${data.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setCheck(null);
    setImageFile(null);
    navigate('/check');
  };

  if (check) {
    const relevant = check.results.filter((r) => r.verdict !== 'no_match');
    const shown = relevant.length ? relevant : check.results.slice(0, 3);
    return (
      <div className="page-enter">
        <button className="back-link link-btn" onClick={startOver}><IconArrowLeft size={15} /> New check</button>
        <div className="check-result">
          <aside className="suspect panel">
            <p className="eyebrow">Suspected copy</p>
            <img src={mediaUrl(check.query_image_url)} alt="Checked image" />
            <p className="muted small">{check.filename || 'Uploaded image'} · checked {relativeTime(check.created_at)}</p>
          </aside>
          <section>
            <Summary check={check} />
            <h3 className="section-title">
              {relevant.length ? `${relevant.length} potential match${relevant.length > 1 ? 'es' : ''}` : 'Closest registry entries'}
            </h3>
            <div className="match-list">
              {shown.map((m, i) => <MatchCard key={m.work_id} match={m} checkId={check.id} rank={i} />)}
              {shown.length === 0 && <p className="muted">The registry is empty.</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <header className="page-head">
        <p className="eyebrow">Copy detection</p>
        <h1 className="page-title">Check a suspected copy</h1>
        <p className="page-subtitle">
          Found your work somewhere else? Upload the image you found and we'll compare it against every registered work,
          even if it was cropped, filtered or AI-edited.
        </p>
      </header>

      <div className="split">
        <div className="split-main">
          <Dropzone file={imageFile} onFile={setImageFile} disabled={loading}>
            {loading && <div className="scan-overlay"><span className="scan-line" /><span className="scan-label">Scanning registry…</span></div>}
          </Dropzone>
        </div>
        <div className="split-side panel">
          {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
          <button className="btn btn-primary btn-block" onClick={scan} disabled={!imageFile || loading}>
            {loading ? <span className="spinner" /> : <><IconScan size={17} /> Scan the registry</>}
          </button>
          <ul className="explainer">
            <li><IconShield size={16} /> <span><strong>Perceptual hash</strong> catches recompressed, resized and lightly filtered copies.</span></li>
            <li><IconScan size={16} /> <span><strong>AI embedding</strong> recognises the same content after crops, flips, colour changes and re-renders.</span></li>
            <li><IconCheck size={16} /> <span>Every check is saved to <Link to="/dashboard?tab=checks">your match history</Link>.</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
