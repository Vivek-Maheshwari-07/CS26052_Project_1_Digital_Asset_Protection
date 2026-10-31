import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { API_BASE, ApiError, apiClient, mediaUrl } from '../api/client';
import { useToast } from '../components/Toast';
import { IconAlert, IconArrowLeft, IconCheck, IconCopy, IconDownload, IconShield } from '../components/Icons';
import { CASE_STATUS, NOTICE_TYPES, followUpDue, statusMeta } from '../lib/cases';
import { formatDate, gateMeta } from '../lib/format';

/** The PDF needs the auth header, so it is fetched and saved rather than linked. */
async function downloadPdf(caseId, payload) {
  const res = await fetch(`${API_BASE}/api/cases/${caseId}/notice.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Could not build the evidence pack.', res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: `evidence-pack-${caseId.slice(0, 8)}.pdf` });
  a.click();
  URL.revokeObjectURL(url);
}

function NoticeBuilder({ c, platforms, onSent }) {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [type, setType] = useState('dmca');
  const [form, setForm] = useState({ name: user?.full_name || '', email: user?.email || '', address: '', phone: '', license_fee: '', payment_link: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const lead = c.grade !== 'evidence';
  const platform = platforms.find((p) => p.id === (c.platform || 'other'));
  const payload = { type, ...form, confirmed_review: confirmed };
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setNotice(null); };

  const run = async (what, fn) => {
    setError(null);
    setBusy(what);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(''); }
  };
  const generate = () => run('generate', async () => setNotice(await apiClient(`/api/cases/${c.id}/notice`, { method: 'POST', json: payload })));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${notice.subject}\n\n${notice.body}`);
      toast('Notice copied. Paste it into the report form or email.');
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };
  const label = NOTICE_TYPES.find(([k]) => k === type)[1];

  return (
    <section className="panel">
      <h3 className="panel-title"><IconShield size={16} /> Notice</h3>
      <div className="segmented notice-types">
        {NOTICE_TYPES.map(([k, name]) => (
          <button key={k} className={type === k ? 'active' : ''} onClick={() => { setType(k); setNotice(null); }}>{name}</button>
        ))}
      </div>
      <p className="muted small">{NOTICE_TYPES.find(([k]) => k === type)[2]}</p>

      {!c.found_url && (
        <div className="alert alert-warn"><IconAlert /> Add the link to the copy under Details first, or the notice will contain a placeholder.</div>
      )}

      <div className="notice-form">
        <label>Your full name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Postal address <span className="muted">(optional)</span><input value={form.address} onChange={set('address')} autoComplete="street-address" /></label>
        <label>Phone <span className="muted">(optional)</span><input value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
        {type === 'license' && (
          <>
            <label>Licence fee<input value={form.license_fee} onChange={set('license_fee')} placeholder="e.g. INR 5,000" /></label>
            <label>Payment link <span className="muted">(optional)</span><input value={form.payment_link} onChange={set('payment_link')} placeholder="https://" /></label>
          </>
        )}
      </div>

      {lead && (
        <label className="lead-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setNotice(null); }} />
          <span>This match is a <b>lead, not proof</b>. I have compared the two images myself and I'm confident the copy is my work.</span>
        </label>
      )}

      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      <button className="btn btn-primary" onClick={generate} disabled={busy || (lead && !confirmed)}>
        {busy === 'generate' ? <span className="spinner" /> : 'Write the notice'}
      </button>

      {notice && (
        <div className="notice-preview">
          <p className="muted small">Send to: <b>{notice.send_to}</b></p>
          <p className="notice-subject">{notice.subject}</p>
          <pre className="notice-body">{notice.body}</pre>
          <div className="action-row">
            <button className="btn btn-ghost" onClick={copy}><IconCopy size={16} /> Copy text</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => run('pdf', () => downloadPdf(c.id, payload))}>
              {busy === 'pdf' ? <span className="spinner" /> : <><IconDownload size={16} /> Evidence pack (PDF)</>}
            </button>
            {c.status === 'open' && (
              <button className="btn btn-primary" disabled={busy}
                onClick={() => run('sent', () => onSent(`${label} to ${platform?.name || 'the platform'}`))}>
                <IconCheck size={16} /> Mark as sent
              </button>
            )}
          </div>
        </div>
      )}
      <p className="muted small">These are templates to review and adapt. They are not legal advice.</p>
    </section>
  );
}

function Details({ c, platforms, onSave }) {
  const [form, setForm] = useState({
    found_url: c.found_url || '', platform: c.platform || '', infringer: c.infringer || '',
    follow_up_on: c.follow_up_on || '', notes: c.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        found_url: form.found_url, platform: form.platform || null, infringer: form.infringer, notes: form.notes,
        ...(form.follow_up_on ? { follow_up_on: form.follow_up_on } : { clear_follow_up: true }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="panel notice-form" onSubmit={save}>
      <h3 className="panel-title">Details</h3>
      <label>Where the copy is (link)<input value={form.found_url} onChange={set('found_url')} placeholder="https://" /></label>
      <label>Platform
        <select value={form.platform} onChange={set('platform')}>
          <option value="">Choose…</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>Posted by <span className="muted">(account or business)</span><input value={form.infringer} onChange={set('infringer')} placeholder="@handle" /></label>
      <label>Follow up on<input type="date" value={form.follow_up_on} onChange={set('follow_up_on')} /></label>
      <label>Notes<textarea rows={3} value={form.notes} onChange={set('notes')} /></label>
      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      <button className="btn btn-secondary" disabled={busy}>{busy ? <span className="spinner" /> : 'Save details'}</button>
    </form>
  );
}

export default function Case() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [c, setCase] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    apiClient(`/api/cases/${caseId}`).then(setCase).catch((e) => setError(e.message));
    apiClient('/api/cases/platforms').then(setPlatforms).catch(() => {});
  }, [caseId]);

  // PATCH returns the case without the work/check context: keep what we already have.
  const patch = async (body) => {
    const updated = await apiClient(`/api/cases/${caseId}`, { method: 'PATCH', json: body });
    setCase((prev) => ({ ...prev, ...updated }));
    return updated;
  };
  const setStatus = async (status, status_note) => {
    try {
      await patch({ status, status_note });
      toast(`Case marked: ${statusMeta(status).label}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      const updated = await apiClient(`/api/cases/${caseId}/notes`, { method: 'POST', json: { text: note } });
      setCase((prev) => ({ ...prev, ...updated }));
      setNote('');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this case and its timeline? The check and your registered work are kept.')) return;
    await apiClient(`/api/cases/${caseId}`, { method: 'DELETE' });
    navigate('/cases');
  };

  if (error) return <div className="empty-state"><span className="empty-icon error"><IconAlert size={28} /></span><h3>Case not found</h3><p>{error}</p><Link className="btn btn-ghost" to="/cases">All cases</Link></div>;
  if (!c) return <div className="full-loader inline"><span className="spinner" /></div>;

  const meta = statusMeta(c.status);
  const gm = c.claim && gateMeta(c.claim.classification);

  return (
    <div className="page-enter case-page">
      <Link to="/cases" className="back-link"><IconArrowLeft size={15} /> All cases</Link>
      <header className="case-head">
        <div>
          <span className={`chip tone-chip tone-${meta.tone}`}>{meta.label}</span>
          {c.grade === 'lead' && <span className="chip tone-chip tone-warn">Lead, not proof</span>}
          {followUpDue(c) && <span className="chip tone-chip tone-bad">Follow-up due</span>}
          <h1 className="page-title">“{c.work.title}”</h1>
          <p className="muted">Opened {formatDate(c.created_at)} · {gm ? gm.label : 'Similarity match'}</p>
        </div>
        <Link className="btn btn-ghost" to={`/evidence/${c.check_id}/${c.work_id}`}>View full evidence</Link>
      </header>

      <div className="case-grid">
        <div className="case-main">
          <section className="panel">
            <div className="compare-side">
              <figure><div className="frame"><img src={mediaUrl(c.check.image_url)} alt="The copy" /></div><figcaption>The copy</figcaption></figure>
              <figure><div className="frame"><img src={mediaUrl(c.work.image_url)} alt="Your registered original" /></div><figcaption>Your original</figcaption></figure>
            </div>
            {c.changes && <p className="changes-headline">What changed: {c.changes.headline}</p>}
          </section>
          <NoticeBuilder c={c} platforms={platforms} onSent={(text) => setStatus('notice_sent', text)} />
        </div>

        <aside className="case-side">
          <Details key={c.updated_at} c={c} platforms={platforms} onSave={async (b) => { await patch(b); toast('Details saved'); }} />

          <section className="panel">
            <h3 className="panel-title">Status</h3>
            <div className="status-buttons">
              {Object.entries(CASE_STATUS).map(([k, s]) => (
                <button key={k} className={`chip tone-chip tone-${s.tone} ${c.status === k ? 'current' : ''}`}
                  aria-pressed={c.status === k} onClick={() => c.status !== k && setStatus(k)}>{s.label}</button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3 className="panel-title">Timeline</h3>
            <ol className="timeline">
              {[...c.events].reverse().map((e, i) => (
                <li key={i} className={`tl-${e.kind}`}><span className="muted small">{formatDate(e.at)}</span><p>{e.text}</p></li>
              ))}
            </ol>
            <form className="note-form" onSubmit={addNote}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note, e.g. they replied" />
              <button className="btn btn-ghost" disabled={!note.trim()}>Add</button>
            </form>
          </section>

          <button className="link-btn danger small" onClick={remove}>Delete case</button>
        </aside>
      </div>
    </div>
  );
}
