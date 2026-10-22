import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SCENARIOS } from '../data/digitalTwinData';
import TwinViewport3D from '../components/DigitalTwin/TwinViewport3D';
import TechModal from '../components/DigitalTwin/TechModal';
import CinematicFilm from '../components/DigitalTwin/CinematicFilm';
import { Logo, IconArrowRight } from '../components/Icons';
import '../components/DigitalTwin/digitalTwin.css';

export default function DigitalTwin() {
  const [activeScenarioId, setActiveScenarioId] = useState('registration');
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTechModal, setActiveTechModal] = useState(null);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const steps = scenario.steps || [];
  const currentStep = steps[currentStepIdx] || steps[0];

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 3800 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, steps.length]);

  // Listen for Mark Copilot tech explainer modal
  useEffect(() => {
    const handleExplain = (e) => {
      if (e.detail?.tech) {
        setActiveTechModal(e.detail.tech);
        setIsPlaying(false);
      }
    };
    window.addEventListener('mark:explain-tech', handleExplain);
    return () => window.removeEventListener('mark:explain-tech', handleExplain);
  }, []);

  // Reset step index when switching scenarios
  const handleSelectScenario = (id) => {
    setActiveScenarioId(id);
    setCurrentStepIdx(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    setCurrentStepIdx((prev) => (prev + 1) % steps.length);
  };

  const handlePrev = () => {
    setCurrentStepIdx((prev) => (prev - 1 + steps.length) % steps.length);
  };

  return (
    <div className="dt-page">
      {/* Top Navigation */}
      <header className="dt-nav">
        <div className="dt-nav-left">
          <Link to="/" className="dt-brand">
            <Logo size={28} />
            <span>Provenance</span>
          </Link>
          <span className="dt-nav-divider">/</span>
          <span className="dt-nav-subtitle">Interactive 3D Pipeline Simulator</span>
        </div>

        <div className="dt-nav-right">
          <Link to="/" className="dt-exit-btn">
            ✕ Exit to Home
          </Link>
          <Link to="/signup" className="lp-btn primary sm">
            Get started <IconArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <section className="film-section">
        <div className="film-head">
          <div>
            <h2>Watch the film: from one photo to proof</h2>
            <p>Ninety seconds, using real pixels, real keypoints and real hashes from this project. Click the picture or press space to pause.</p>
          </div>
          <span className="film-badge">NOW SHOWING</span>
        </div>
        <CinematicFilm />
      </section>

      <div className="film-explore">
        <h2>Now explore it yourself</h2>
        <p>Pick a scenario, orbit the 3D twin, and open any algorithm for the plain-English explanation.</p>
      </div>

      <main className="dt-main">
        {/* Scenario Selection Cards */}
        <section className="dt-scenarios-strip">
          <div className="dt-scenarios-label">SELECT PIPELINE SCENARIO:</div>
          <div className="dt-scenarios-grid">
            {SCENARIOS.map((s) => {
              const isActive = s.id === activeScenarioId;
              return (
                <button
                  key={s.id}
                  className={`dt-scenario-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectScenario(s.id)}
                >
                  <div className="dt-sc-header">
                    <span className="dt-sc-badge">{s.badge}</span>
                    {isActive && <span className="dt-sc-indicator">LIVE</span>}
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.subtitle}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3D Viewport Simulation */}
        <section className="dt-viewport-section">
          <TwinViewport3D
            scenario={scenario}
            currentStep={currentStep}
            onInspectTech={(tKey) => {
              setIsPlaying(false);
              setActiveTechModal(tKey);
            }}
          />
        </section>

        {/* Playback Controls & Scrubber Timeline */}
        <section className="dt-controls-bar">
          <div className="dt-playback-btns">
            <button
              className="dt-ctrl-btn"
              onClick={handlePrev}
              title="Previous Step"
            >
              ⏮
            </button>
            <button
              className="dt-ctrl-btn play-btn"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              className="dt-ctrl-btn"
              onClick={handleNext}
              title="Next Step"
            >
              ⏭
            </button>

            <button
              className="dt-speed-btn"
              onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : 1))}
              title="Toggle Playback Speed"
            >
              {playbackSpeed}x Speed
            </button>
          </div>

          {/* Stepper Timeline Pills */}
          <div className="dt-timeline">
            {steps.map((st, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isPast = idx < currentStepIdx;
              return (
                <button
                  key={st.code}
                  className={`dt-timeline-step ${isCurrent ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => {
                    setCurrentStepIdx(idx);
                    setIsPlaying(false);
                  }}
                >
                  <span className="dt-step-num">{idx + 1}</span>
                  <div className="dt-step-info">
                    <strong>{st.code}</strong>
                    <span>{st.title.split(' ')[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detailed Stage Telemetry & Explanation Card */}
        <section className="dt-detail-card">
          <div className="dt-detail-left">
            <div className="dt-stage-header">
              <span className="dt-stage-code">{currentStep.code}</span>
              <h2>{currentStep.title}</h2>
            </div>
            <p className="dt-summary">{currentStep.summary}</p>
            <p className="dt-explanation">{currentStep.explanation}</p>

            <div className="dt-action-row">
              <button
                className="lp-btn primary"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveTechModal(currentStep.activeTech);
                }}
              >
                🔬 Deep-Dive Algorithm: {currentStep.activeTech?.toUpperCase()}
              </button>
              <span className="dt-tip-text">Click to view mathematical equations, benchmarks & competitor comparisons</span>
            </div>
          </div>

          <div className="dt-detail-right">
            <h3>STAGE TELEMETRY & HARDWARE METRICS</h3>
            <div className="dt-telemetry-grid">
              {Object.entries(currentStep.metrics || {}).map(([key, val]) => (
                <div key={key} className="dt-metric-box">
                  <span className="dt-metric-label">{key}</span>
                  <strong className="dt-metric-val">{val}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Tech Deep-Dive Modal */}
      {activeTechModal && (
        <TechModal
          techKey={activeTechModal}
          onClose={() => setActiveTechModal(null)}
        />
      )}
    </div>
  );
}
