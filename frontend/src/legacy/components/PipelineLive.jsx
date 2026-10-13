import { useEffect, useMemo, useRef, useState } from 'react';
import { mediaUrl } from '@/lib/api';
import { perceptualHash, hexToBits } from '../lib/phash';
import { gateMeta } from '../lib/format';
import { IconCheck } from './Icons';

/* ------------------------------------------------------------------ visuals (all driven by real pipeline data) */

function HashVisual({ file, serverHash }) {
  const [local, setLocal] = useState(null);
  useEffect(() => {
    let cancelled = false;
    perceptualHash(file).then((r) => !cancelled && setLocal(r)).catch(() => {});
    return () => { cancelled = true; };
  }, [file]);
  const bits = serverHash ? hexToBits(serverHash) : local?.bits;
  return (
    <div className="pl-hash">
      <div>
        <div className="pl-cap">What the hash sees: {local?.mosaicSize || 24}×{local?.mosaicSize || 24} luminance</div>
        <div className="pl-mosaic" style={{ gridTemplateColumns: `repeat(${local?.mosaicSize || 24}, 1fr)` }}>
          {(local?.mosaic || Array(576).fill(40)).map((v, i) => (
            <span key={i} style={{ background: `rgb(${v},${v},${v})`, animationDelay: `${(i % 24) * 14 + Math.floor(i / 24) * 22}ms` }} />
          ))}
        </div>
      </div>
      <div>
        <div className="pl-cap">64-bit perceptual hash {serverHash ? '(from the server)' : '(reading structure…)'}</div>
        <div className="pl-bits">
          {(bits || Array(64).fill(0)).map((b, i) => (
            <span key={i} className={b ? 'on' : ''} style={{ animationDelay: `${i * 14}ms` }} />
          ))}
        </div>
        {serverHash && <code className="pl-hex">{serverHash}</code>}
      </div>
    </div>
  );
}

function EmbedVisual({ preview, dim }) {
  const max = Math.max(0.001, ...(preview || [0]).map(Math.abs));
  return (
    <div>
      <div className="pl-cap">First 64 of {dim || 512} CLIP dimensions. A DINOv2 vector (384) and 5 crop vectors are computed the same way.</div>
      <div className="pl-embed">
        {(preview || Array(64).fill(0)).map((v, i) => (
          <span key={i} className={v >= 0 ? 'pos' : 'neg'} style={{ height: `${Math.max(4, (Math.abs(v) / max) * 100)}%`, animationDelay: `${i * 12}ms` }} />
        ))}
      </div>
    </div>
  );
}

function SearchVisual({ scores, scope, title }) {
  return (
    <div>
      <div className="pl-cap">{title || `Searched ${scope ?? '…'} of your registered works`}</div>
      <div className="pl-cands">
        {(scores?.results || []).slice(0, 4).map((r, i) => (
          <div key={r.work_id} className="pl-cand" style={{ animationDelay: `${i * 120}ms` }}>
            <img src={mediaUrl(r.image_url)} alt="" />
            <div>
              <strong title={r.title}>{r.title}</strong>
              <div className="pl-bar"><span style={{ width: `${Math.max(2, r.confidence * 100)}%` }} /></div>
              <small>pHash {(r.phash * 100).toFixed(0)}% · CLIP {(r.embedding * 100).toFixed(0)}%</small>
            </div>
          </div>
        ))}
        {scores && scores.results.length === 0 && <p className="muted small">You have no registered works to compare against yet.</p>}
      </div>
    </div>
  );
}

/** The real SIFT correspondences, drawn between the suspect and the registered work. */
function MatchSvg({ qSrc, tSrc, matches, flip }) {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([1, 1]); i.src = src; });
    Promise.all([load(qSrc), load(tSrc)]).then(([q, t]) => alive && setDims({ q, t }));
    return () => { alive = false; };
  }, [qSrc, tSrc]);
  if (!dims) return <div className="pl-loading"><span className="spinner" /></div>;
  const H = 250, gap = 70;
  const wq = Math.round((H * dims.q[0]) / dims.q[1]), wt = Math.round((H * dims.t[0]) / dims.t[1]);
  const W = wq + gap + wt;
  // The matches were found on the flipped query, so show the flipped image and use the coordinates directly.
  const qx = (x) => x * wq;
  const qy = (y) => y * H;
  const qTransform = flip === 'h' ? `translate(${wq},0) scale(-1,1)` : flip === 'v' ? `translate(0,${H}) scale(1,-1)` : undefined;
  return (
    <svg className="pl-match" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Matched keypoints between your image and the registered work">
      <g transform={qTransform}><image href={qSrc} x="0" y="0" width={wq} height={H} preserveAspectRatio="none" /></g>
      <image href={tSrc} x={wq + gap} y="0" width={wt} height={H} preserveAspectRatio="none" />
      {matches.map(([a, b, c, d], i) => (
        <g key={i} className="pl-line" style={{ animationDelay: `${i * 28}ms` }}>
          <line x1={qx(a)} y1={qy(b)} x2={wq + gap + c * wt} y2={d * H} />
          <circle cx={qx(a)} cy={qy(b)} r="2.6" /><circle cx={wq + gap + c * wt} cy={d * H} r="2.6" />
        </g>
      ))}
    </svg>
  );
}

function AlignVisual({ qUrl, g2s, scores }) {
  const urls = Object.fromEntries((scores?.results || []).map((r) => [r.work_id, mediaUrl(r.image_url)]));
  const best = [...g2s].filter((g) => g.credible && urls[g.work_id]).sort((a, b) => b.inliers - a.inliers)[0];
  const tried = g2s.length;
  if (!best) {
    return (
      <div>
        <div className="pl-cap">SIFT keypoints are matched, then MAGSAC/RANSAC looks for one geometric transform that explains them.</div>
        <p className="pl-empty">{tried ? `${tried} candidate${tried === 1 ? '' : 's'} checked: no consistent alignment found.` : 'Finding keypoints and matching them…'}</p>
        {tried === 0 && <span className="spinner" />}
      </div>
    );
  }
  return (
    <div>
      <div className="pl-cap">
        {best.inliers} matched SIFT keypoints agree on one transform{best.flip ? ` (your image is ${best.flip === 'h' ? 'mirrored' : 'flipped'})` : ''},
        scale ×{best.scale}, rotation {best.rotation}°, {(best.tight * 100).toFixed(0)}% fit within 2 px.
      </div>
      <MatchSvg qSrc={qUrl} tSrc={urls[best.work_id]} matches={best.matches} flip={best.flip} />
    </div>
  );
}

function Gauge({ label, value, unit, good, max, hint }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="pl-gauge">
      <div className="pl-gauge-top"><span>{label}</span><strong>{value}{unit}</strong></div>
      <div className="pl-bar"><span className={good ? 'good' : 'warn'} style={{ width: `${Math.max(2, pct)}%` }} /></div>
      <small>{hint}</small>
    </div>
  );
}

function CompareVisual({ g3s }) {
  const best = [...g3s].sort((a, b) => a.residual_p90 - b.residual_p90)[0];
  if (!best) return <div><div className="pl-cap">Warping the image onto the original, matching brightness and colour, then measuring what still differs.</div><p className="pl-empty">Only candidates that aligned are compared pixel by pixel.</p></div>;
  return (
    <div>
      <div className="pl-cap">After alignment and photometric matching, on structured pixels only (blank areas prove nothing)</div>
      <div className="pl-gauges">
        <Gauge label="Typical difference" value={best.residual_median} unit=" / 255" max={30} good={best.residual_median <= 4} hint="median residual; copies are 0 to 3" />
        <Gauge label="Pixels that changed" value={(best.changed_frac * 100).toFixed(1)} unit="%" max={30} good={best.changed_frac <= 0.05} hint="share differing strongly" />
        <Gauge label="Leftover shift" value={best.flow_px} unit=" px" max={5} good={best.flow_px <= 1} hint="optical flow after alignment" />
        {best.hp_ncc !== null && best.hp_ncc !== undefined && <Gauge label="Fine-detail match" value={Math.round(best.hp_ncc * 100)} unit="%" max={100} good={best.hp_ncc >= 0.5} hint="high-pass correlation" />}
      </div>
    </div>
  );
}

function GradeVisual({ g4s, g5 }) {
  const rank = { TIER1: 0, TIER2: 1, RELATED_DIFFERENT_CAPTURE: 2, TIER3: 3 };
  const claims = g4s.filter((g) => g.active && g.active !== 'NONE').sort((a, b) => rank[a.active] - rank[b.active]);
  const top = claims[0];
  const meta = top ? gateMeta(top.active) : null;
  return (
    <div className="pl-grade">
      {meta ? (
        <div className={`pl-verdict tone-${meta.tone}`}><strong>{meta.label}</strong><small>{meta.grade === 'evidence' ? 'Evidence grade' : 'A lead: a person should review it'}</small></div>
      ) : (
        <div className="pl-verdict tone-ok"><strong>No match found</strong><small>Nothing in your registry links to this image</small></div>
      )}
      {g5?.evidence_paths?.overlay && (
        <div className="pl-evidence">
          {['overlay', 'heatmap', 'changes'].filter((k) => g5.evidence_paths[k]).map((k) => (
            <figure key={k}><img src={mediaUrl(`/uploads/${g5.evidence_paths[k]}`)} alt={k} /><figcaption>{k === 'changes' ? 'changed regions' : k}</figcaption></figure>
          ))}
        </div>
      )}
    </div>
  );
}

function ChainVisual({ chain }) {
  return (
    <div>
      <div className="pl-cap">Appended to the tamper-evident SHA-256 chain, then submitted to OpenTimestamps for Bitcoin anchoring</div>
      {chain ? (
        <div className="pl-chain">
          <div><small>previous entry</small><code>{chain.prev_hash}</code></div>
          <span className="pl-link" aria-hidden>↓</span>
          <div className="new"><small>this registration</small><code>{chain.entry_hash}</code></div>
        </div>
      ) : <span className="spinner" />}
    </div>
  );
}

/* ------------------------------------------------------------------ the panel */

export default function PipelineLive({ kind, file, events, status, elapsed, onComplete }) {
  const pre = kind === 'register' ? 'gate_' : '';
  const ev = (s) => events.find((e) => e.stage === s)?.data;
  const all = (s) => events.filter((e) => e.stage === s).map((e) => e.data);
  const finished = status !== 'running' && status !== 'idle';

  const d = { read: ev('read'), fp: ev('fingerprint'), search: ev('search'), scores: ev('scores'), dup: ev('duplicate'), g1: ev(pre + 'g1'),
              g2s: all(pre + 'g2'), g3s: all(pre + 'g3'), g4s: all(pre + 'g4'), g5: ev(pre + 'g5'), chain: ev('chain'), anchor: ev('anchor') };

  const steps = useMemo(() => {
    const common = [
      { id: 'read', label: 'Decode and normalise', done: !!d.read, detail: d.read && `${d.read.width}×${d.read.height} px ${d.read.format || ''}` },
      { id: 'hash', label: 'Perceptual hash', done: !!d.fp, detail: d.fp && `pHash ${d.fp.phash}` },
      { id: 'embed', label: 'CLIP + DINOv2 embeddings', done: !!d.fp, detail: d.fp && `${d.fp.clip_dim}-d semantic vector, ${d.fp.seconds}s` },
    ];
    const best = [...d.g2s].filter((g) => g.credible).sort((a, b) => b.inliers - a.inliers)[0];
    const g4top = d.g4s.find((g) => g.active && g.active !== 'NONE');
    const align = { id: 'align', label: 'SIFT alignment (RANSAC)', done: d.g2s.length > 0 || finished,
      detail: best ? `${best.inliers} matched keypoints, ${(best.tight * 100).toFixed(0)}% tight fit` : d.g2s.length ? 'no consistent alignment' : null };
    const compare = { id: 'compare', label: 'Pixel-level comparison', done: d.g3s.length > 0 || finished,
      detail: d.g3s[0] && `typical difference ${d.g3s[0].residual_median}/255, ${(d.g3s[0].changed_frac * 100).toFixed(1)}% changed` };
    const grade = { id: 'grade', label: 'Grade the evidence', done: d.g4s.length > 0 || finished,
      detail: g4top ? (gateMeta(g4top.active)?.label || g4top.active) : d.g4s.length ? 'no claim' : null };
    if (kind === 'register') {
      return [...common,
        { id: 'dup', label: 'Compare against the registry', done: !!d.dup, detail: d.dup && `${d.dup.works_searched} registered works searched` },
        { id: 'gate', label: 'Alignment check against registered works', done: !!d.g1 || !!d.chain, detail: d.g1 ? `${d.g1.candidates.length} candidate${d.g1.candidates.length === 1 ? '' : 's'} examined` : 'skipped' },
        { id: 'chain', label: 'Write to the hash chain', done: !!d.chain, detail: d.chain && `entry ${d.chain.entry_hash.slice(0, 16)}…` },
        { id: 'anchor', label: 'Queue the Bitcoin timestamp', done: !!d.anchor, detail: d.anchor && 'submitted to OpenTimestamps' }];
    }
    return [...common,
      { id: 'search', label: 'Search your registry', done: !!d.scores, detail: d.search && `${d.search.scope} of your works, ${d.search.hits} candidates` },
      align, compare, grade];
  }, [events, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal one step at a time so fast stages stay visible
  const trueDone = steps.filter((s) => s.done).length;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShown((s) => (s < trueDone ? s + 1 : s)), finished ? 150 : 420);
    return () => clearInterval(id);
  }, [trueDone, finished]);
  const settled = shown >= steps.length;
  const completeRef = useRef(false);
  useEffect(() => {
    if (finished && settled && !completeRef.current) { completeRef.current = true; setTimeout(() => onComplete?.(), 600); }
  }, [finished, settled, onComplete]);

  const [pinned, setPinned] = useState(null);
  const active = Math.min(shown, steps.length - 1);
  const focus = pinned !== null ? pinned : active;
  const focusId = steps[focus]?.id;
  const [qUrl, setQUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setQUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const visual = {
    read: <HashVisual file={file} serverHash={null} />,
    hash: <HashVisual file={file} serverHash={d.fp?.phash} />,
    embed: <EmbedVisual preview={d.fp?.clip_preview} dim={d.fp?.clip_dim} />,
    search: <SearchVisual scores={d.scores} scope={d.search?.scope} />,
    dup: <SearchVisual scores={null} title={d.dup ? `Compared against ${d.dup.works_searched} registered works: ${d.dup.duplicate ? 'a near-duplicate was found' : 'no near-duplicate found'}` : 'Comparing against the registry…'} />,
    gate: (
      <div>
        <div className="pl-cap">Your upload is aligned against existing registered works. Pixel-level evidence that it copies someone else blocks the registration.</div>
        <p className="pl-empty">{d.g1 ? `${d.g1.candidates.length} candidate${d.g1.candidates.length === 1 ? '' : 's'} examined, ${d.g4s.filter((g) => g.active && g.active !== 'NONE').length} flagged` : 'Examining…'}</p>
      </div>
    ),
    align: qUrl ? <AlignVisual qUrl={qUrl} g2s={d.g2s} scores={d.scores} /> : null,
    compare: <CompareVisual g3s={d.g3s} />,
    grade: <GradeVisual g4s={d.g4s} g5={d.g5} />,
    chain: <ChainVisual chain={d.chain} />,
    anchor: <ChainVisual chain={d.chain} />,
  }[focusId];

  return (
    <div className="pl">
      <div className="pl-head">
        <div><strong>{kind === 'register' ? 'Registering your work' : 'Checking your image'}</strong>
          <small>Every step below is running on your photo right now</small></div>
        <span className="pl-timer">{(elapsed || 0).toFixed(1)}s</span>
      </div>
      <div className="pl-body">
        <ol className="pl-steps">
          {steps.map((s, i) => {
            const done = i < shown && s.done;
            const current = i === shown && !settled;
            return (
              <li key={s.id} className={`${done ? 'done' : ''} ${current ? 'active' : ''} ${i === focus ? 'focus' : ''}`}>
                <button onClick={() => (i <= shown ? setPinned(i === active ? null : i) : null)} disabled={i > shown}>
                  <span className="ps-dot">{done ? <IconCheck size={12} /> : current ? <span className="spinner spinner-sm" /> : null}</span>
                  <span className="ps-text"><b>{s.label}</b>{done && s.detail && <small>{s.detail}</small>}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="pl-stage" key={focusId}>
          {qUrl && <img className="pl-thumb" src={qUrl} alt="Your image" />}
          <div className="pl-visual">{visual}</div>
        </div>
      </div>
    </div>
  );
}
