import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, mediaUrl, certificateUrl, recordJsonUrl, proofUrl, verifyKitUrl } from '../api/client';
import { AuthContext } from '../AuthContext';
import { Logo, IconCheck, IconAlert, IconClock, IconDownload, IconShield, IconHash } from '../components/Icons';
import { formatDate } from '../lib/format';

function CheckItem({ ok, pending, title, children }) {
  return (
    <li className={`vcheck ${ok ? 'ok' : pending ? 'pending' : 'bad'}`}>
      <span className="vcheck-icon">{ok ? <IconCheck size={14} /> : pending ? <IconClock size={14} /> : <IconAlert size={14} />}</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </li>
  );
}

function anchorText(anchor) {
  if (anchor.status === 'confirmed') {
    const when = anchor.block_time ? `, mined ${formatDate(anchor.block_time, { dateStyle: 'long', timeStyle: 'short' })}` : '';
    return `Confirmed in Bitcoin block #${anchor.block_height}${when}. `
      + (anchor.block_checked ? 'Cross-checked against a public block explorer.' : 'Not yet cross-checked against a block explorer.');
  }
  if (anchor.status === 'pending') {
    return `Submitted ${formatDate(anchor.submitted_at)}. It confirms in a Bitcoin block within a few hours; download the proof to check it independently.`;
  }
  if (anchor.status === 'invalid') return "The proof names a Bitcoin block whose contents don't match it. Treat this timestamp as unproven.";
  return 'Not anchored yet.';
}

const sha256Hex = async (file) => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Hashing happens in the browser: the creator's original never leaves their device.
function FileCheck({ expected }) {
  const [result, setResult] = useState(null);
  if (!window.crypto?.subtle) return null; // only available on https or localhost
  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResult({ name: file.name, checking: true });
    setResult({ name: file.name, match: (await sha256Hex(file)) === expected });
  };
  return (
    <div className="file-check">
      <label className="btn btn-ghost">
        <input type="file" hidden onChange={onFile} /> Do you have the original file? Check it here
      </label>
      {result && !result.checking && (
        <p className={result.match ? 'file-check-ok' : 'file-check-bad'}>
          {result.match ? <><IconCheck size={14} /> {result.name} is the exact file that was registered.</>
            : <><IconAlert size={14} /> {result.name} is not the registered file (its SHA-256 differs).</>}
        </p>
      )}
      <p className="muted small">The file is hashed in your browser and never uploaded.</p>
    </div>
  );
}

export default function Verify() {
  const { workId } = useParams();
  const { status } = useContext(AuthContext);
  const [work, setWork] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient(`/api/public/works/${workId}`).then(setWork).catch((e) => setError(e.message));
    apiClient('/api/registry/status').then(setRegistry).catch(() => {});
  }, [workId]);

  const verified = work && work.record_intact && work.chain_linked;
  const anchor = work?.anchor;

  return (
    <div className="verify-shell">
      <header className="verify-top">
        <Link to="/" className="brand"><Logo /> <span>Provenance</span></Link>
        {status === 'authed'
          ? <Link className="btn btn-ghost" to="/dashboard">Open app</Link>
          : <Link className="btn btn-ghost" to="/login">Log in</Link>}
      </header>

      <main className="verify-main page-enter">
        {error ? (
          <div className="empty-state">
            <span className="empty-icon error"><IconAlert size={28} /></span>
            <h3>No registration found</h3>
            <p>{error} Check that the link or QR code is complete.</p>
          </div>
        ) : !work ? (
          <div className="full-loader inline"><span className="spinner" /></div>
        ) : (
          <>
            <div className={`verify-banner ${verified ? 'ok' : 'bad'}`}>
              <span className="vb-icon">{verified ? <IconShield size={24} /> : <IconAlert size={24} />}</span>
              <div>
                <strong>{verified ? 'Verified registration' : 'Verification failed'}</strong>
                <p>{verified
                  ? `This work was registered on ${formatDate(work.created_at, { dateStyle: 'long', timeStyle: 'long' })} and its record is unaltered.`
                    + (anchor.status === 'confirmed' && anchor.block_checked
                      ? ` Bitcoin proves it existed no later than ${formatDate(anchor.block_time, { dateStyle: 'long', timeStyle: 'short' })}.` : '')
                  : 'This record no longer matches its registry hash. It may have been modified after registration.'}</p>
              </div>
            </div>

            <div className="verify-grid">
              <div className="verify-media panel">
                {work.image_url && <img src={mediaUrl(work.image_url)} alt={work.title} />}
              </div>
              <div>
                <p className="eyebrow">Registry entry #{work.registry_position}</p>
                <h1 className="page-title">{work.title}</h1>
                <p className="muted">by {work.owner_name}</p>

                <ul className="vchecks">
                  <CheckItem ok={work.record_intact} title="Record hash recomputes">
                    SHA-256 of the registered data matches the stored registry hash.
                  </CheckItem>
                  <CheckItem ok={work.chain_linked} title="Linked into the hash chain">
                    The entry before it and the entry after it both reference this hash.
                  </CheckItem>
                  <CheckItem ok={anchor.status === 'confirmed'} pending={anchor.status === 'pending'} title="Bitcoin timestamp (OpenTimestamps)">
                    {anchorText(anchor)}
                  </CheckItem>
                  {registry && (
                    <CheckItem ok={registry.valid} title={`Whole registry ${registry.valid ? 'intact' : 'broken'}`}>
                      All {registry.length} entries were re-verified just now.
                    </CheckItem>
                  )}
                </ul>

                <div className="hash-block">
                  <div><div className="hash-label"><IconHash size={14} /> Registry hash</div><div className="hash-value static"><code>{work.entry_hash}</code></div></div>
                  <div><div className="hash-label"><IconHash size={14} /> Previous entry</div><div className="hash-value static"><code>{work.prev_hash}</code></div></div>
                  {work.file_sha256 && (
                    <div><div className="hash-label"><IconHash size={14} /> Registered file (SHA-256)</div><div className="hash-value static"><code>{work.file_sha256}</code></div></div>
                  )}
                </div>

                {work.file_sha256 && <FileCheck expected={work.file_sha256} />}

                <div className="action-row">
                  <a className="btn btn-primary" href={verifyKitUrl(work.id)}><IconDownload size={16} /> Verification kit</a>
                  <a className="btn btn-ghost" href={certificateUrl(work.id)} target="_blank" rel="noreferrer">Certificate</a>
                  <a className="btn btn-ghost" href={recordJsonUrl(work.id)}>record.json</a>
                  {anchor.has_proof && <a className="btn btn-ghost" href={proofUrl(work.id)}>Timestamp proof (.ots)</a>}
                </div>

                <details className="howto">
                  <summary>Verify it yourself, without trusting us</summary>
                  <ol>
                    <li>Download the <strong>verification kit</strong> and unzip it.</li>
                    <li>Run <code>python verify.py</code> (Python 3, no installs). It checks that the record is unaltered, that the
                      timestamp proof covers it, and replays the proof to a Bitcoin block it looks up on a public explorer.</li>
                    {work.file_sha256 && <li>Add your original file to also prove it is the exact file registered:<br /><code>python verify.py your-original.jpg</code></li>}
                    <li>Optional cross-check with the official OpenTimestamps client:<br /><code>pip install opentimestamps-client</code><br /><code>ots verify record.json.ots -f record.json</code></li>
                  </ol>
                </details>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
