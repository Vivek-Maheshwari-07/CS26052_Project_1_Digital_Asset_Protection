import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl, certificateUrl, verifyPath } from '../api/client';
import { useToast } from './Toast';
import {
  IconClose, IconChevronLeft, IconChevronRight, IconDownload, IconCopy,
  IconScan, IconShield, IconClock, IconHash, IconFingerprint,
} from './Icons';

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

function HashRow({ icon: Ico, label, value }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied`);
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };
  return (
    <div className="hash-row">
      <div className="hash-label"><Ico size={14} /> {label}</div>
      <button className="hash-value" onClick={copy} title="Click to copy">
        <code>{value}</code>
        <IconCopy size={14} />
      </button>
    </div>
  );
}

export default function WorkModal({ work, onClose, onPrev, onNext, position }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button className="modal-nav modal-prev" onClick={onPrev} disabled={!onPrev} aria-label="Previous work">
        <IconChevronLeft size={22} />
      </button>

      <div className="modal" role="dialog" aria-modal="true" aria-label={work.title} key={work.id}>
        <div className="modal-media">
          <img src={mediaUrl(work.image_url)} alt={work.title} />
        </div>
        <div className="modal-side">
          <div className="modal-top">
            <span className="chip chip-success"><IconShield size={13} /> Registered</span>
            {work.anchor_status === 'pending' && <span className="chip chip-brand" title="Hash submitted to Bitcoin via OpenTimestamps">Bitcoin timestamp pending</span>}
            <span className="muted small">{position}</span>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
          </div>

          <h2 className="modal-title">{work.title}</h2>
          <p className="modal-owner">by {work.owner_name}</p>

          <div className="meta-list">
            <div><IconClock size={15} /> <span>{formatDate(work.created_at)}</span></div>
            {work.width && <div><IconFingerprint size={15} /> <span>{work.width} × {work.height}px · pHash {work.phash}</span></div>}
          </div>

          <div className="hash-block">
            <HashRow icon={IconHash} label="Registry hash" value={work.entry_hash} />
            <HashRow icon={IconHash} label="Previous hash" value={work.prev_hash} />
          </div>
          <p className="hash-note">
            This hash links your registration to every entry before it. Any later change to this record would break the chain.
          </p>

          <div className="modal-actions">
            <a className="btn btn-primary" href={certificateUrl(work.id)} target="_blank" rel="noreferrer">
              <IconDownload size={16} /> Certificate
            </a>
            <Link className="btn btn-ghost" to={verifyPath(work.id)}><IconShield size={16} /> Public record</Link>
            <Link className="btn btn-ghost" to="/check"><IconScan size={16} /> Check copies</Link>
          </div>
        </div>
      </div>

      <button className="modal-nav modal-next" onClick={onNext} disabled={!onNext} aria-label="Next work">
        <IconChevronRight size={22} />
      </button>
    </div>
  );
}
