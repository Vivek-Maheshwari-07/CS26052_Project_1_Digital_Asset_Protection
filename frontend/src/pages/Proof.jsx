import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE, ApiError, apiClient, mediaUrl, verifyPath } from '../api/client';
import ProofLadder from '../components/ProofLadder';
import { useToast } from '../components/Toast';
import { IconAlert, IconArrowLeft, IconCheck, IconCopy, IconPlus, IconSearch } from '../components/Icons';
import { formatDate } from '../lib/format';

const short = (hash) => `${hash.slice(0, 10)}…${hash.slice(-6)}`;

/** Multipart upload with the auth header (apiClient sends JSON or forms, not files). */
async function uploadSource(workId, file) {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${API_BASE}/api/works/${workId}/proof/files`, {
    method: 'POST', body, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Upload failed.', res.status);
  return data;
}

function SourceFiles({ workId, files, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const add = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try { onChange(await uploadSource(workId, file)); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (id) => onChange(await apiClient(`/api/works/${workId}/proof/files/${id}`, { method: 'DELETE' }));
  return (
    <div className="proof-action">
      {files.length > 0 && (
        <ul className="proof-files">
          {files.map((f) => (
            <li key={f.id} className={f.strong ? 'strong' : ''}>
              <div>
                <strong>{f.filename || 'File'}</strong>
                <span className="muted small">{f.detail}</span>
                <span className="muted small">
                  {f.width ? `${f.width} × ${f.height}px · ` : ''}{(f.size / 1e6).toFixed(1)} MB · SHA-256 <code>{short(f.sha256)}</code>
                  {' · '}{f.anchor_status === 'confirmed' ? 'timestamped in Bitcoin' : f.anchor_status === 'pending' ? 'Bitcoin timestamp pending' : 'added ' + formatDate(f.added_at)}
                </span>
              </div>
              <button className="link-btn danger small" onClick={() => remove(f.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" hidden onChange={add} />
      <button className="btn btn-secondary" onClick={() => input.current.click()} disabled={busy}>
        {busy ? <><span className="spinner" /> Checking against your work…</> : <><IconPlus size={16} /> Add a source file</>}
      </button>
      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      <p className="muted small">
        PSD, Krita, Procreate, a larger export or a camera RAW file, up to 80 MB. It is matched against your work, then only its
        fingerprint (SHA-256) is kept and timestamped: the file itself is not stored.
      </p>
    </div>
  );
}

function WebCheck({ workId, available, priorArt, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try { onChange(await apiClient(`/api/works/${workId}/proof/web-check`, { method: 'POST' })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const setMine = async (url, mine) =>
    onChange(await apiClient(`/api/works/${workId}/proof/web-check/mine`, { method: 'POST', json: { url, mine } }));
  if (!available) {
    return <p className="muted small proof-action">An administrator can turn this on with a Google Cloud Vision API key (PRIOR_ART_PROVIDER in backend/.env).</p>;
  }
  return (
    <div className="proof-action">
      {priorArt && priorArt.matches.length > 0 && (
        <ul className="proof-files">
          {priorArt.matches.map((m) => (
            <li key={m.url} className={m.mine ? 'strong' : 'warn'}>
              <div>
                <a href={m.url} target="_blank" rel="noreferrer noopener"><strong>{m.title || new URL(m.url).hostname}</strong></a>
                <span className="muted small">{m.url} · {m.kind === 'full' ? 'exact copy' : 'partial match'}</span>
              </div>
              <label className="mine-toggle"><input type="checkbox" checked={m.mine} onChange={(e) => setMine(m.url, e.target.checked)} /> This is mine</label>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-secondary" onClick={run} disabled={busy}>
        {busy ? <span className="spinner" /> : <><IconSearch size={16} /> {priorArt ? 'Search again' : 'Search the web for this image'}</>}
      </button>
      {priorArt && <p className="muted small">Last searched {formatDate(priorArt.checked_at)}.</p>}
      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      <p className="muted small">This sends your registered image to Google's search service. It only runs when you click.</p>
    </div>
  );
}

function ProfileLinks({ links, onChange }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const act = async (key, fn) => {
    setBusy(key);
    setError(null);
    try { await fn(); await onChange(); } catch (err) { setError(err.message); } finally { setBusy(''); }
  };
  const add = (e) => {
    e.preventDefault();
    act('add', async () => { await apiClient('/api/me/profile-links', { method: 'POST', json: { url } }); setUrl(''); });
  };
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch { toast('Could not copy', 'error'); }
  };
  return (
    <div className="proof-action">
      {links.length > 0 && (
        <ul className="proof-files">
          {links.map((l) => (
            <li key={l.id} className={l.verified ? 'strong' : ''}>
              <div>
                <a href={l.url} target="_blank" rel="noreferrer noopener"><strong>{l.url}</strong></a>
                {l.verified ? (
                  <span className="muted small"><IconCheck size={13} /> Verified {formatDate(l.verified_at)}. You can remove the code from the page now.</span>
                ) : (
                  <>
                    <span className="muted small">Put this code anywhere on that page (bio, about text, a post), save it, then check:</span>
                    <button className="proof-code" onClick={() => copy(l.code)} title="Copy"><code>{l.code}</code> <IconCopy size={13} /></button>
                    {l.last_error && <span className="small proof-error">{l.last_error}</span>}
                  </>
                )}
              </div>
              <div className="proof-link-actions">
                {!l.verified && (
                  <button className="btn btn-ghost" disabled={!!busy} onClick={() => act(l.id, () => apiClient(`/api/me/profile-links/${l.id}/verify`, { method: 'POST' }))}>
                    {busy === l.id ? <span className="spinner" /> : 'Check'}
                  </button>
                )}
                <button className="link-btn danger small" onClick={() => act('rm' + l.id, () => apiClient(`/api/me/profile-links/${l.id}`, { method: 'DELETE' }))}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="note-form" onSubmit={add}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-portfolio.example" />
        <button className="btn btn-secondary" disabled={!url.trim() || busy === 'add'}>Link page</button>
      </form>
      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      <p className="muted small">Applies to all your works. Pages that need a login or JavaScript to show (Instagram, X) can't be checked; a portfolio, personal site, Behance or GitHub page works.</p>
    </div>
  );
}

export default function Proof() {
  const { workId } = useParams();
  const [proof, setProof] = useState(null);
  const [work, setWork] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(
    () => apiClient(`/api/works/${workId}/proof`).then(setProof).catch((e) => setError(e.message)),
    [workId],
  );
  useEffect(() => {
    load();
    apiClient(`/api/public/works/${workId}`).then(setWork).catch(() => {});
  }, [workId, load]);

  if (error) return <div className="empty-state"><span className="empty-icon error"><IconAlert size={28} /></span><h3>Work not found</h3><p>{error}</p><Link className="btn btn-ghost" to="/dashboard?tab=works">My works</Link></div>;
  if (!proof) return <div className="full-loader inline"><span className="spinner" /></div>;

  return (
    <div className="page-enter proof-page">
      <Link to="/dashboard?tab=works" className="back-link"><IconArrowLeft size={15} /> My works</Link>
      <header className="case-head">
        <div className="proof-head">
          {work?.image_url && <img src={mediaUrl(work.image_url)} alt="" />}
          <div>
            <p className="eyebrow">Proof of authorship</p>
            <h1 className="page-title">{work ? `“${work.title}”` : 'Your work'}</h1>
            <p className="muted">Strengthen the evidence that you made this, not just that you registered it first.</p>
          </div>
        </div>
        <Link className="btn btn-ghost" to={verifyPath(workId)}>Public record</Link>
      </header>
      <section className="panel">
        <ProofLadder ladder={proof.ladder} actions={{
          earliest: <WebCheck workId={workId} available={proof.web_check_available} priorArt={proof.prior_art} onChange={setProof} />,
          source: <SourceFiles workId={workId} files={proof.files} onChange={setProof} />,
          identity: <ProfileLinks links={proof.links} onChange={load} />,
        }} />
      </section>
    </div>
  );
}
