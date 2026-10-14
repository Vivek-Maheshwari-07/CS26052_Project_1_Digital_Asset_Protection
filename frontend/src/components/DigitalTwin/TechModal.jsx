import { TECH_SPECS } from '../../data/digitalTwinData';
import { IconCheck } from '../Icons';

export default function TechModal({ techKey, onClose }) {
  if (!techKey || !TECH_SPECS[techKey]) return null;
  const spec = TECH_SPECS[techKey];

  return (
    <div className="dt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dt-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="dt-modal-header">
          <div>
            <span className="dt-modal-cat">{spec.category}</span>
            <h2>{spec.name}</h2>
            <div className="dt-modal-role">{spec.role}</div>
          </div>
          <button className="dt-modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <div className="dt-modal-body">
          {spec.equation && (
            <div className="dt-math-box">
              <div className="dt-math-header">
                <span className="dt-math-label">Core Mathematical Formulation</span>
                <span className="dt-math-badge">Clean Formula</span>
              </div>
              <div className="dt-math-code">{spec.equation}</div>
              {spec.plainFormula && (
                <div className="dt-math-plain">
                  <strong>In Plain English:</strong> {spec.plainFormula}
                </div>
              )}
            </div>
          )}

          <section className="dt-spec-sec">
            <h3>What is it?</h3>
            <p>{spec.whatItIs}</p>
          </section>

          <section className="dt-spec-sec">
            <h3>How does it work in our pipeline?</h3>
            <p>{spec.howItWorks}</p>
          </section>

          <section className="dt-spec-sec">
            <h3>Why we chose it over alternatives</h3>
            <ul className="dt-why-list">
              {spec.whyWeChoseIt.map((reason, i) => (
                <li key={i}>
                  <span className="dt-why-icon"><IconCheck size={14} /></span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          {spec.comparison && spec.comparison.length > 0 && (
            <section className="dt-spec-sec">
              <h3>Comparison with Industry Alternatives</h3>
              <div className="dt-comp-table-wrap">
                <table className="dt-comp-table">
                  <thead>
                    <tr>
                      <th>Technology</th>
                      <th>Strength</th>
                      <th>Limitation</th>
                      <th>Our Evaluation & Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spec.comparison.map((c, i) => {
                      const isChosen = c.name.includes('(Our Choice)');
                      return (
                        <tr key={i} className={isChosen ? 'dt-chosen-row' : ''}>
                          <td><strong>{c.name}</strong></td>
                          <td className="dt-pro">{c.pro}</td>
                          <td className="dt-con">{c.con}</td>
                          <td className="dt-verdict">{c.ourVerdict}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <footer className="dt-modal-footer">
          <button className="lp-btn primary" onClick={onClose}>Resume Simulation</button>
        </footer>
      </div>
    </div>
  );
}
