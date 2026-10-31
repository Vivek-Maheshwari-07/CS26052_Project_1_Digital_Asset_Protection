import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { apiClient, mediaUrl } from '../api/client';
import { Logo, IconScan, IconAlert, IconArrowRight } from '../components/Icons';

const STEPS = [
  ['Pick a work', 'Choose any artwork below, or one of the prints at the booth.'],
  ['Steal it', 'Photograph it, screenshot it, crop it, filter it, add stickers or text. Anything goes.'],
  ['Upload your copy', 'We search the gallery and show exactly what you changed. No sign-up needed.'],
];

export default function Booth() {
  const { status, user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [booth, setBooth] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiClient('/api/booth').then(setBooth).catch((err) => setError(err.message));
  }, []);

  // A visitor gets a throwaway guest session; someone already signed in just goes on to the check.
  const start = async () => {
    setError(null);
    if (status === 'authed') { navigate('/check'); return; }
    setStarting(true);
    try {
      const session = await apiClient('/api/booth/session', { method: 'POST' });
      login(session.access_token, session.user);
      navigate('/check');
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  const member = status === 'authed' && !user?.is_guest;

  return (
    <main className="app-container booth page-enter">
      <Link to="/" className="brand booth-brand"><Logo /> <span>Provenance</span></Link>

      {!booth && !error && <div className="full-loader"><span className="spinner" /></div>}
      {error && <div className="alert alert-error"><IconAlert /> {error}</div>}

      {booth && !booth.enabled && (
        <div className="panel booth-off">
          <h1 className="page-title">Booth mode is off</h1>
          <p className="muted">Set <code>BOOTH_MODE=true</code> in <code>backend/.env</code> to run the booth.</p>
          <Link to="/" className="btn btn-secondary">Go to the home page</Link>
        </div>
      )}

      {booth?.enabled && (
        <>
          <header className="page-head booth-head">
            <p className="eyebrow">Live challenge</p>
            <h1 className="page-title">Can you fool us?</h1>
            <p className="page-subtitle">
              Every artwork here is registered. Steal one, change it however you like, and see if we still recognise it.
            </p>
          </header>

          <ol className="booth-steps">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="panel"><span className="booth-step-n">{i + 1}</span><div><strong>{title}</strong><p className="muted small">{text}</p></div></li>
            ))}
          </ol>

          {!booth.ready && (
            <div className="alert alert-error"><IconAlert /> The booth gallery isn't set up yet. Ask the team at the booth.</div>
          )}
          <button className="btn btn-primary btn-block booth-cta" onClick={start}
            disabled={!booth.ready || starting || status === 'loading'}>
            {starting ? <span className="spinner" /> : <><IconScan size={18} /> Upload your copy <IconArrowRight size={16} /></>}
          </button>
          {member && <p className="muted small booth-note">You're signed in as {user.username}, so checks search your own works, not the booth gallery.</p>}

          {booth.gallery.length > 0 && (
            <section>
              <h3 className="section-title">The gallery ({booth.gallery.length})</h3>
              <div className="booth-gallery">
                {booth.gallery.map((w) => (
                  <figure key={w.id} className="panel">
                    {w.image_url && <img src={mediaUrl(w.image_url)} alt={w.title} loading="lazy" />}
                    <figcaption><strong>{w.title}</strong><span className="muted small">by {w.owner_name}</span></figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          <p className="muted small booth-note">Uploads from the booth are deleted at the end of each day.</p>
        </>
      )}
    </main>
  );
}
