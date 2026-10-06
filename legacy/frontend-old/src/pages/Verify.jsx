import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, mediaUrl, certificateUrl, recordJsonUrl, proofUrl } from '../api/client';
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
                    {anchor.status === 'pending'
                      ? `Submitted ${formatDate(anchor.submitted_at)}. It confirms in a Bitcoin block within a few hours; download the proof to check it independently.`
                      : anchor.status === 'confirmed' ? 'Confirmed in the Bitcoin blockchain.'
                        : 'Not anchored yet.'}
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
                </div>

                <div className="action-row">
                  <a className="btn btn-primary" href={certificateUrl(work.id)} target="_blank" rel="noreferrer"><IconDownload size={16} /> Certificate</a>
                  <a className="btn btn-ghost" href={recordJsonUrl(work.id)}>record.json</a>
                  {anchor.has_proof && <a className="btn btn-ghost" href={proofUrl(work.id)}>Timestamp proof (.ots)</a>}
                </div>

                <details className="howto">
                  <summary>Verify it yourself</summary>
                  <ol>
                    <li>Download <code>record.json</code>. Its SHA-256 equals the registry hash above:<br /><code>sha256sum record-{work.id}.json</code></li>
                    {anchor.has_proof && <li>Download the <code>.ots</code> proof and check the Bitcoin timestamp with the OpenTimestamps client:<br /><code>pip install opentimestamps-client</code><br /><code>ots upgrade record-{work.id}.json.ots</code><br /><code>ots verify record-{work.id}.json.ots</code></li>}
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
