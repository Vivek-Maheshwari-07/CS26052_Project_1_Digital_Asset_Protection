import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, mediaUrl, certificateUrl } from '../api/client';
import { AuthContext } from '../AuthContext';
import Masonry from '../components/Masonry';
import WorkModal from '../components/WorkModal';
import ScoreRing from '../components/ScoreRing';
import {
  IconSearch, IconPlus, IconDownload, IconImage, IconShield, IconClock, IconGrid, IconAlert, IconClose,
  IconScan, IconArrowRight,
} from '../components/Icons';
import { relativeTime, verdictMeta } from '../lib/format';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const SORTS = {
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  title: (a, b) => a.title.localeCompare(b.title),
};

function PinCard({ work, ratio, onOpen, onMeasured, index }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <article className="pin" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <button className="pin-media" onClick={() => onOpen(work.id)} aria-label={`Open ${work.title}`}
        style={{ aspectRatio: `1 / ${ratio}` }}>
        {!loaded && !failed && <span className="pin-shimmer" />}
        {failed ? (
          <span className="pin-fallback"><IconImage size={28} /> Image unavailable</span>
        ) : (
          <img
            src={mediaUrl(work.image_url)}
            alt={work.title}
            loading="lazy"
            className={loaded ? 'loaded' : ''}
            onLoad={(e) => {
              setLoaded(true);
              if (!work.width) onMeasured(work.id, e.target.naturalHeight / e.target.naturalWidth);
            }}
            onError={() => setFailed(true)}
          />
        )}
        <span className="pin-overlay">
          <span className="chip chip-glass"><IconShield size={12} /> Registered</span>
        </span>
      </button>
      <a className="pin-action" href={certificateUrl(work.id)} target="_blank" rel="noreferrer"
        title="Download certificate" aria-label={`Download certificate for ${work.title}`}>
        <IconDownload size={16} />
      </a>
      <div className="pin-caption">
        <h3 title={work.title}>{work.title}</h3>
        <p>{relativeTime(work.created_at)}</p>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  const heights = [1.3, 0.9, 1.5, 1.1, 0.8, 1.25, 1.4, 1, 0.75, 1.2];
  return (
    <Masonry
      items={heights.map((r, i) => ({ id: i, r }))}
      getRatio={(x) => x.r}
      renderItem={(x) => (
        <div key={x.id} className="pin pin-skeleton">
          <div className="pin-media" style={{ aspectRatio: `1 / ${x.r}` }}><span className="pin-shimmer" /></div>
          <div className="sk-line" /><div className="sk-line short" />
        </div>
      )}
    />
  );
}

function RegistryBadge() {
  const [status, setStatus] = useState(null);
  useEffect(() => { apiClient('/api/registry/status').then(setStatus).catch(() => {}); }, []);
  if (!status) return null;
  return (
    <span className={`registry-badge ${status.valid ? 'ok' : 'bad'}`}
      title={status.head_hash ? `Latest entry hash: ${status.head_hash}` : 'Registry is empty'}>
      <span className="dot" />
      {status.valid ? `Registry intact · ${status.length} entr${status.length === 1 ? 'y' : 'ies'} verified` : 'Registry integrity check failed'}
    </span>
  );
}

function History({ checks }) {
  if (checks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon brand"><IconScan size={26} /></span>
        <h3>No checks yet</h3>
        <p>When you find a suspicious image online, check it against the registry. Results are saved here.</p>
        <Link to="/check" className="btn btn-primary"><IconScan size={16} /> Check an image</Link>
      </div>
    );
  }
  return (
    <div className="history-list">
      {checks.map((c, i) => {
        const meta = verdictMeta(c.top_verdict);
        return (
          <Link key={c.id} to={`/check/${c.id}`} className="history-row" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            <div className="match-thumb"><img src={mediaUrl(c.query_image_url)} alt="" loading="lazy" /></div>
            <div className="match-info">
              <strong>{c.top_verdict === 'no_match' ? 'No match found' : `Matched “${c.top_title}”`}</strong>
              <span className="muted small">{c.filename || 'Uploaded image'} · {relativeTime(c.created_at)}</span>
            </div>
            <span className={`chip tone-chip tone-${meta.tone}`}>{meta.label}</span>
            <span className="muted small hide-sm">{c.match_count} match{c.match_count === 1 ? '' : 'es'}</span>
            <ScoreRing value={c.top_confidence} verdict={c.top_verdict} size={48} stroke={5} />
            <IconArrowRight size={18} className="match-go" />
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'checks' ? 'checks' : 'works';
  const [works, setWorks] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [openId, setOpenId] = useState(null);
  const [measured, setMeasured] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, c] = await Promise.all([apiClient('/api/works'), apiClient('/api/checks')]);
      setWorks(w);
      setChecks(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works
      .filter((w) => !q || w.title.toLowerCase().includes(q) || w.owner_name.toLowerCase().includes(q))
      .sort(SORTS[sort]);
  }, [works, query, sort]);

  const getRatio = useCallback(
    (w) => (w.width && w.height ? w.height / w.width : measured[w.id] || 1.25),
    [measured],
  );
  const onMeasured = useCallback((id, r) => setMeasured((m) => (m[id] ? m : { ...m, [id]: r })), []);

  const stats = useMemo(() => {
    const latest = works.reduce((a, w) => (!a || new Date(w.created_at) > new Date(a) ? w.created_at : a), null);
    const flagged = checks.filter((c) => c.top_verdict !== 'no_match').length;
    return { total: works.length, flagged, latest };
  }, [works, checks]);

  const openIndex = visible.findIndex((w) => w.id === openId);
  const openWork = openIndex >= 0 ? visible[openIndex] : null;
  const firstName = (user?.full_name || user?.username || '').split(' ')[0];
  const setTab = (t) => setParams(t === 'checks' ? { tab: 'checks' } : {}, { replace: true });

  return (
    <div className="dashboard page-enter">
      <header className="dash-hero">
        <div>
          <p className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="dash-title">Your portfolio</h1>
          <p className="dash-sub">Every piece here is fingerprinted and anchored in the provenance registry.</p>
          <RegistryBadge />
        </div>
        <Link to="/works/new" className="btn btn-primary btn-lg"><IconPlus size={18} /> Register new work</Link>
      </header>

      <section className="stats">
        <div className="stat">
          <span className="stat-icon violet"><IconGrid /></span>
          <div><strong>{loading ? '–' : stats.total}</strong><span>Registered works</span></div>
        </div>
        <button className="stat stat-link" onClick={() => setTab('checks')}>
          <span className="stat-icon pink"><IconScan /></span>
          <div><strong>{loading ? '–' : stats.flagged}</strong><span>Copies detected in {checks.length} check{checks.length === 1 ? '' : 's'}</span></div>
        </button>
        <div className="stat">
          <span className="stat-icon amber"><IconClock /></span>
          <div><strong>{loading || !stats.latest ? '–' : relativeTime(stats.latest)}</strong><span>Last registration</span></div>
        </div>
      </section>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'works'} className={tab === 'works' ? 'active' : ''} onClick={() => setTab('works')}>
            <IconGrid size={16} /> Works <span className="count">{works.length}</span>
          </button>
          <button role="tab" aria-selected={tab === 'checks'} className={tab === 'checks' ? 'active' : ''} onClick={() => setTab('checks')}>
            <IconScan size={16} /> Match history <span className="count">{checks.length}</span>
          </button>
        </div>
        {tab === 'works' && !loading && !error && works.length > 0 && (
          <div className="toolbar-right">
            <div className="search">
              <IconSearch />
              <input placeholder="Search your works" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search works" />
              {query && <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><IconClose size={15} /></button>}
            </div>
            <div className="segmented" role="tablist" aria-label="Sort works">
              {[['newest', 'Newest'], ['oldest', 'Oldest'], ['title', 'A–Z']].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={sort === k} className={sort === k ? 'active' : ''} onClick={() => setSort(k)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="empty-state">
          <span className="empty-icon error"><IconAlert size={28} /></span>
          <h3>We couldn't load your portfolio</h3>
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={load}>Try again</button>
        </div>
      ) : tab === 'checks' ? (
        <History checks={checks} />
      ) : works.length === 0 ? (
        <div className="empty-state">
          <div className="empty-art">
            <span style={{ height: 70 }} /><span style={{ height: 100 }} /><span style={{ height: 56 }} />
          </div>
          <h3>Your portfolio is empty</h3>
          <p>Register your first original piece to fingerprint it and get a timestamped certificate.</p>
          <Link to="/works/new" className="btn btn-primary"><IconPlus size={16} /> Register your first work</Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state compact">
          <h3>No works match “{query}”</h3>
          <button className="btn btn-ghost" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <Masonry
          items={visible}
          getRatio={getRatio}
          renderItem={(w, i) => (
            <PinCard key={w.id} work={w} index={i} ratio={getRatio(w)} onOpen={setOpenId} onMeasured={onMeasured} />
          )}
        />
      )}

      {openWork && (
        <WorkModal
          work={openWork}
          position={`${openIndex + 1} of ${visible.length}`}
          onClose={() => setOpenId(null)}
          onPrev={openIndex > 0 ? () => setOpenId(visible[openIndex - 1].id) : null}
          onNext={openIndex < visible.length - 1 ? () => setOpenId(visible[openIndex + 1].id) : null}
        />
      )}
    </div>
  );
}

