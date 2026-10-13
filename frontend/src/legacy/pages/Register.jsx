import { useState, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { certificateUrl, mediaUrl, verifyPath } from '@/lib/api';
import { AuthContext } from '@/auth/auth-context';
import Dropzone from '../components/Dropzone';
import { Field } from '../components/FormControls';
import { useToast } from '../components/Toast';
import PipelineLive from '../components/PipelineLive';
import useJob from '../lib/useJob';
import {
  IconFingerprint, IconShield, IconClock, IconAlert, IconDownload, IconCheck, IconPlus, IconGrid, IconCopy,
} from '../components/Icons';

const formatDate = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function DuplicateNotice({ conflict, onOverride, loading }) {
  const m = conflict.match;
  return (
    <div className={`conflict ${conflict.is_own ? 'own' : ''}`}>
      <div className="conflict-head">
        <IconAlert size={18} />
        <strong>{conflict.message}</strong>
      </div>
      <div className="conflict-body">
        {m.image_url && <img src={mediaUrl(m.image_url)} alt="" />}
        <div>
          {m.title && <p><strong>{m.title}</strong></p>}
          <p className="muted small">Registered by {m.owner_name} on {formatDate(m.created_at)}</p>
          <p className="muted small">Similarity {(m.confidence * 100).toFixed(1)}%</p>
          <Link className="small" to={verifyPath(m.id)} target="_blank">View registry record</Link>
        </div>
      </div>
      {conflict.can_override ? (
        <button className="btn btn-ghost" onClick={onOverride} disabled={loading}>
          It's a different piece, register it anyway
        </button>
      ) : (
        <p className="small muted">
          The first registration wins. If you believe this is your original work, keep your source files
          and contact the platform where the copy appeared.
        </p>
      )}
    </div>
  );
}

export default function Register() {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [ownerName, setOwnerName] = useState(user?.full_name || '');
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);
  const job = useJob();
  const busy = useRef(false);

  const submit = async (allowSimilarOwn = false) => {
    if (!imageFile || !ownerName.trim() || !title.trim() || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setConflict(null);
    try {
      const formData = new FormData();
      formData.append('owner_name', ownerName.trim());
      formData.append('title', title.trim());
      formData.append('image', imageFile);
      if (allowSimilarOwn) formData.append('allow_similar_own', 'true');
      // The work is registered by a server job; the live view below shows each stage as it runs.
      const r = await job.start('/api/works/register/start', formData);
      if (!r || r.status === 'error') {
        busy.current = false;
        setLoading(false);
        const e = r?.error;
        if (e?.status === 409 && e.detail?.match) setConflict(e.detail);
        else setError(typeof e?.detail === 'string' ? e.detail : e?.detail?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      busy.current = false;
      setLoading(false);
      setError(err.message);
    }
  };

  const finish = () => {
    busy.current = false;
    setResult(job.result);
    setLoading(false);
    toast('Work registered and fingerprinted');
  };

  const reset = () => {
    setResult(null);
    setImageFile(null);
    setTitle('');
    setConflict(null);
  };

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(result.entry_hash);
      toast('Registry hash copied');
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };

  if (result) {
    return (
      <div className="page-enter register-success">
        <div className="success-card">
          <div className="success-media">
            <img src={mediaUrl(result.image_url)} alt={result.title} />
            <span className="chip chip-success"><IconShield size={13} /> Registered</span>
          </div>
          <div className="success-body">
            <div className="success-ring sm"><IconCheck size={24} /></div>
            <h1 className="page-title">“{result.title}” is protected</h1>
            <p className="page-subtitle">
              Fingerprinted and added to the registry on {formatDate(result.created_at)}. Its hash is being
              timestamped in Bitcoin through OpenTimestamps.
            </p>
            {result.gate_notices?.length > 0 && (
              <div className="alert alert-warn">
                <IconAlert />
                <span>{result.gate_notices.join(' ')}</span>
              </div>
            )}
            <div className="hash-value static" onClick={copyHash} title="Copy hash" role="button">
              <code>{result.entry_hash}</code><IconCopy size={14} />
            </div>
            <div className="action-row">
              <a className="btn btn-primary" href={certificateUrl(result.id)} target="_blank" rel="noreferrer">
                <IconDownload size={16} /> Download certificate
              </a>
              <Link className="btn btn-ghost" to={verifyPath(result.id)}><IconShield size={16} /> Public record</Link>
            </div>
            <div className="action-row subtle">
              <button className="link-btn strong" onClick={reset}><IconPlus size={15} /> Register another</button>
              <Link className="link-btn" to="/dashboard"><IconGrid size={15} /> Go to portfolio</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <header className="page-head">
        <p className="eyebrow">New registration</p>
        <h1 className="page-title">Register original work</h1>
        <p className="page-subtitle">Upload the original file. We fingerprint it, timestamp it, and add it to your portfolio.</p>
      </header>

      {loading && imageFile && (
        <PipelineLive kind="register" file={imageFile} events={job.events} status={job.status} elapsed={job.elapsed} onComplete={finish} />
      )}

      <div className="split" style={loading ? { display: 'none' } : undefined}>
        <div className="split-main">
          <Dropzone file={imageFile} onFile={(f) => { setImageFile(f); setConflict(null); }} disabled={loading}>
            {loading && <div className="scan-overlay"><span className="scan-line" /></div>}
          </Dropzone>
        </div>

        <form className="split-side panel" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <Field id="title" label="Title" placeholder="e.g. Morning over the harbour" value={title}
            onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={loading} />
          <Field id="owner" label="Creator name (shown on the certificate)" value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)} maxLength={80} disabled={loading} />

          {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
          {conflict && <DuplicateNotice conflict={conflict} loading={loading} onOverride={() => submit(true)} />}

          {(
            <button className="btn btn-primary btn-block" disabled={!imageFile || !title.trim() || !ownerName.trim()}>
              <IconShield size={17} /> Register & fingerprint
            </button>
          )}

          <ul className="explainer">
            <li><IconFingerprint size={16} /> <span><strong>Six fingerprint layers:</strong> file hash, perceptual hash, CLIP and DINOv2 embeddings, SIFT features and the registry hash, all listed on your certificate.</span></li>
            <li><IconShield size={16} /> <span><strong>Tamper-evident:</strong> each entry is hashed together with the one before it.</span></li>
            <li><IconClock size={16} /> <span><strong>Timestamped:</strong> the hash is anchored in Bitcoin via OpenTimestamps.</span></li>
          </ul>
        </form>
      </div>
    </div>
  );
}
