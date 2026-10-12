import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { Logo, IconArrowRight, IconShield, IconFingerprint, IconScan, IconCheck } from '../components/Icons';
import results from '../data/results.json';
import demo from '../assets/evidence-demo.png';
import '../features.css';

const int = (x) => Number(x).toLocaleString('en-US');
const pct = (x) => `${Math.round(x)}%`;

const STEPS = [
  ['Register', 'Upload your original. We fingerprint it six independent ways, chain it into a tamper-evident registry and timestamp it in Bitcoin.'],
  ['Check', 'Found something suspicious? Upload it. We search only your own registered works, so nothing about your portfolio is shared.'],
  ['See the evidence', 'The image is aligned onto your original, compared pixel by pixel, and graded. You get an overlay, a difference heatmap and the changed regions.'],
  ['Prove it', 'Download a certificate with a QR code to a public page anyone can verify, including every fingerprint layer and the registry hash.'],
];

const CLAIMS = [
  ['ev', 'Evidence', 'Pixel evidence of copying', 'After alignment, the unchanged regions match pixel for pixel. This is the only grade we call evidence.'],
  ['ld', 'Lead', 'A related image, review needed', 'The images align but pixels differ: edited, re-rendered, or a second photo of the same scene. Never presented as proof.'],
  ['md', 'Metadata', 'What the file declares', 'Signed C2PA manifests and IPTC tags that declare AI generation are read and checked. Missing metadata is never read as real.'],
];

export default function Landing() {
  const { status } = useContext(AuthContext);
  const authed = status === 'authed';
  const r = results;
  const cm = r.compare;
  const rows = [
    ['Altered copies detected', cm.classic_strict.positives, cm.gate_evidence.positives, true],
    ['False alarms on same-scene look-alikes', cm.classic_strict.siblings, cm.gate_evidence.siblings, false],
    ['False alarms on unrelated images', cm.classic_strict.unrelated, cm.gate_evidence.unrelated, false],
  ];
  const cta = authed ? '/dashboard' : '/signup';

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand"><Logo size={30} /> Provenance</Link>
          <div className="lp-links">
            <a href="#how" className="hide-sm">How it works</a>
            <a href="#claims" className="hide-sm">What we claim</a>
            <a href="#results" className="hide-sm">Results</a>
            <a href="#data" className="hide-sm">Datasets</a>
            {authed ? <Link to="/dashboard" className="lp-btn primary">Open dashboard</Link>
              : <><Link to="/login">Log in</Link><Link to="/signup" className="lp-btn primary">Get started</Link></>}
          </div>
        </div>
      </nav>

      <header className="lp-hero">
        <span className="lp-glow a" /><span className="lp-glow b" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="lp-eyebrow"><i /> Verifiable provenance for digital art and photography</span>
          <h1>Prove you made it <em>first</em>, and catch every altered copy.</h1>
          <p className="lp-lead">
            Register your original work. When a cropped, filtered, recompressed or re-rendered copy turns up, we show exactly how it
            was derived from yours, with evidence a person can check, not a black-box score.
          </p>
          <div className="lp-cta">
            <Link to={cta} className="lp-btn primary lg">Get started <IconArrowRight size={18} /></Link>
            <a href="#results" className="lp-btn ghost lg">See the results</a>
          </div>
        </div>
        <figure className="lp-hero-art lp-demo">
          <img src={demo} alt="Aligned overlay, difference heatmap and changed regions for a pair of photos" style={{ width: '100%', borderRadius: 12, display: 'block' }} />
          <figcaption>Real output from our test run: aligned overlay, difference heatmap, changed regions</figcaption>
          <div className="lp-chips"><span>SIFT alignment</span><span>pixel-level comparison</span><span>graded evidence</span></div>
        </figure>
      </header>

      <section className="lp-strip" aria-label="Headline numbers">
        <div><strong>{pct(r.positive_all.tier1)}</strong><span>of altered copies get pixel-level evidence</span></div>
        <div><strong>{r.negatives.false_evidence} of {r.negatives.n}</strong><span>look-alikes wrongly called evidence</span></div>
        <div><strong>{int(r.suspects)}</strong><span>test images against {int(r.registry)} registered works</span></div>
        <div><strong>{r.latency.total.p50.toFixed(1)} s</strong><span>median check time on a laptop CPU</span></div>
      </section>

      <section className="lp-sec" id="how">
        <h2>From upload to proof in four steps</h2>
        <p className="sub">Built for independent illustrators and photographers who have no way today to prove who came first.</p>
        <div className="lp-steps">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="lp-card"><div className="num">{i + 1}</div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="claims">
        <h2>We only call it evidence when it is</h2>
        <p className="sub">Every result carries a grade. A takedown request should never rest on a guess, so the system separates what it can prove from what only deserves a look.</p>
        <div className="lp-claims">
          {CLAIMS.map(([cls, tag, t, d]) => (
            <div key={t} className={`lp-card ${cls}`}><span className={`lp-tag ${cls}`}>{tag}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="results">
        <div className="lp-two">
          <div>
            <h2>Same coverage, far fewer false alarms</h2>
            <p className="sub">
              Compared with fingerprint scores alone (perceptual hash + CLIP) on identical test images. The classic score at its strict
              threshold flags 70% of near-identical look-alikes; the gate calls {r.negatives.false_evidence} of {r.negatives.n} evidence.
            </p>
            <Link to={cta} className="lp-btn primary">Try it on your own work <IconArrowRight size={16} /></Link>
          </div>
          <div className="lp-bars">
            {rows.map(([label, classic, gate]) => (
              <div key={label}>
                <div className="lp-bar-row"><span>{label}</span><span className="lp-bar-track"><span className="lp-bar-fill dim" style={{ width: `${Math.max(1, classic)}%`, display: 'block' }} /></span><b>{pct(classic)}</b></div>
                <div className="lp-bar-row"><span style={{ color: '#6ee7b7' }}>… with the gate</span><span className="lp-bar-track"><span className="lp-bar-fill" style={{ width: `${Math.max(1, gate)}%`, display: 'block' }} /></span><b>{pct(gate)}</b></div>
              </div>
            ))}
            <small style={{ color: '#8683a8' }}>Grey: classic score, strict threshold. Gradient: evidence-grade claims from the verification gate.</small>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="data">
        <h2>Tested on a dataset built to break it</h2>
        <p className="sub">Illustrations, flat vector art, transparent sprites, phone portraits, night shots and documents, with real WhatsApp round-trips and AI edits.</p>
        <div className="lp-data">
          {[[100, 'original works'], [1200, 'scripted edits: crops to 10%, rotations, JPEG q10, blur, screenshots'], [41, 'real WhatsApp round-trips'],
            [75, 'Gemini AI edits (light, medium, heavy)'], [70, 'look-alikes and unrelated images that must not be flagged'], [978, 'distractor works for registry scale']].map(([n, l]) => (
            <div key={l} className="lp-card"><strong>{int(n)}</strong><span>{l}</span></div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <h2>Who it is for</h2>
        <div className="lp-purpose" style={{ marginTop: '1.6rem' }}>
          {[[IconFingerprint, 'Independent creators', 'Register originals, monitor for altered copies, and keep a certificate that proves when you registered.'],
            [IconScan, 'Rights reviewers', 'Open a flagged image and see how closely it matches a registered work, with the evidence laid out.'],
            [IconShield, 'Researchers', 'A measured comparison of classic hashing, embeddings and geometric verification on a published dataset.']].map(([Ico, t, d]) => (
            <div key={t} className="lp-card"><Ico size={22} /><h3 style={{ marginTop: '.8rem' }}>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <div className="lp-final">
        <div>
          <h2>Register your first work in under a minute</h2>
          <Link to={cta} className="lp-btn lg">Get started <IconArrowRight size={18} /></Link>
        </div>
      </div>
      <p className="lp-foot"><IconCheck size={13} /> Local demo build. The sample library on the dashboard is placeholder content used to test the registry at scale.</p>
    </div>
  );
}
