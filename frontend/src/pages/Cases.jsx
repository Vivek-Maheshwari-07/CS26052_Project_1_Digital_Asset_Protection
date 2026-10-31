import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, mediaUrl } from '../api/client';
import { IconAlert, IconArrowRight, IconClock, IconScan } from '../components/Icons';
import { followUpDue, statusMeta } from '../lib/cases';
import { formatDate, relativeTime } from '../lib/format';

export default function Cases() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient('/api/cases').then(setCases).catch((e) => setError(e.message));
  }, []);

  const active = cases?.filter((c) => ['open', 'notice_sent'].includes(c.status)) || [];
  const due = cases?.filter(followUpDue) || [];

  return (
    <div className="page-enter">
      <header className="page-head">
        <p className="eyebrow">Enforcement</p>
        <h1 className="page-title">Cases</h1>
        <p className="page-subtitle">
          Every copy you decide to act on: where it was found, the notice you sent, and what happened next.
          Open a case from the evidence page of a match.
        </p>
      </header>

      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}
      {!cases && !error && <div className="full-loader inline"><span className="spinner" /></div>}

      {cases && cases.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon"><IconScan size={28} /></span>
          <h3>No cases yet</h3>
          <p>Check a suspected copy. When it matches one of your works, open a case from its evidence page.</p>
          <Link className="btn btn-primary" to="/check"><IconScan size={16} /> Check a copy</Link>
        </div>
      )}

      {cases && cases.length > 0 && (
        <>
          <p className="muted small cases-summary">
            {active.length} active · {cases.length - active.length} resolved
            {due.length > 0 && <span className="chip tone-chip tone-bad"><IconClock size={13} /> {due.length} follow-up due</span>}
          </p>
          <div className="match-list">
            {cases.map((c) => {
              const meta = statusMeta(c.status);
              return (
                <Link key={c.id} to={`/cases/${c.id}`} className="match-row case-row">
                  <div className="match-thumb">{c.work?.image_url && <img src={mediaUrl(c.work.image_url)} alt="" loading="lazy" />}</div>
                  <div className="match-info">
                    <strong>{c.work?.title || 'Deleted work'}</strong>
                    <span className="muted small">
                      {c.found_url ? new URL(c.found_url).hostname : 'Link not recorded yet'}
                      {' · '}updated {relativeTime(c.updated_at)}
                      {followUpDue(c) && <> · <b className="due">follow up since {formatDate(c.follow_up_on, { dateStyle: 'medium' })}</b></>}
                    </span>
                  </div>
                  {c.grade === 'lead' && <span className="chip tone-chip tone-warn">Lead</span>}
                  <span className={`chip tone-chip tone-${meta.tone}`}>{meta.label}</span>
                  <IconArrowRight size={18} className="match-go" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
