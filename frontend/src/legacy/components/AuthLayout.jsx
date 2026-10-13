import { Logo, IconShield, IconFingerprint, IconScan } from './Icons';

// Decorative "artworks" for the animated mosaic: [height, gradient]
const TILES = [
  [180, 'linear-gradient(160deg,#f97316,#db2777)'],
  [240, 'linear-gradient(200deg,#0ea5e9,#6366f1)'],
  [150, 'linear-gradient(140deg,#facc15,#f97316)'],
  [210, 'linear-gradient(180deg,#a855f7,#1e1b4b)'],
  [170, 'linear-gradient(120deg,#10b981,#0e7490)'],
  [260, 'linear-gradient(200deg,#f472b6,#7c3aed)'],
  [140, 'linear-gradient(160deg,#38bdf8,#22d3ee)'],
  [220, 'linear-gradient(140deg,#fb7185,#fbbf24)'],
  [190, 'linear-gradient(190deg,#6366f1,#0f172a)'],
];

const column = (offset) => {
  const items = [0, 1, 2, 3, 4, 5].map((i) => TILES[(i * 2 + offset) % TILES.length]);
  return [...items, ...items]; // duplicated for a seamless loop
};

const FEATURES = [
  { icon: IconFingerprint, text: 'Dual fingerprinting: perceptual hash + AI embeddings' },
  { icon: IconShield, text: 'Tamper-evident, timestamped registry' },
  { icon: IconScan, text: 'Catch crops, filters and AI-edited copies' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-showcase" aria-hidden="true">
        <div className="mosaic">
          {[0, 1, 2].map((c) => (
            <div key={c} className={`mosaic-col mosaic-col-${c}`}>
              {column(c * 3).map(([h, bg], i) => (
                <div key={i} className="mosaic-tile" style={{ height: h, background: bg }}>
                  {i % 4 === 1 && <span className="tile-badge"><IconShield size={12} /> Registered</span>}
                  {i % 5 === 2 && <span className="tile-scan" />}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="showcase-overlay">
          <div className="brand brand-light"><Logo /> <span>Provenance</span></div>
          <div className="showcase-copy">
            <h1>Your art.<br /><em>Provably</em> yours.</h1>
            <p>Register your original work, get a timestamped certificate, and find out when someone copies it.</p>
            <ul>
              {FEATURES.map(({ icon: Ico, text }) => (
                <li key={text}><span><Ico size={16} /></span>{text}</li>
              ))}
            </ul>
          </div>
          <div className="match-card">
            <div className="match-dot" />
            <div>
              <strong>Match detected · 94.2%</strong>
              <small>Registered 12 days before the copy appeared</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="brand auth-mobile-brand"><Logo /> <span>Provenance</span></div>
        <div className="auth-panel">{children}</div>
        <p className="auth-footnote">© {new Date().getFullYear()} Provenance · Digital Asset Registry</p>
      </main>
    </div>
  );
}
