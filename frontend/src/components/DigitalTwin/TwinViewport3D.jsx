import { useState, useRef, useEffect } from 'react';
import catOrig from '../../assets/cat-orig.png';
import catHeatmap from '../../assets/cat-heatmap.png';
import catMask from '../../assets/cat-mask.png';
import catCrop50 from '../../assets/cat-crop50.png';
import catFlip from '../../assets/cat-flip.png';
import { TECH_SPECS } from '../../data/digitalTwinData';

export default function TwinViewport3D({ scenario, currentStep, onInspectTech }) {
  const [is3D, setIs3D] = useState(true);
  const [isCinematicOrbit, setIsCinematicOrbit] = useState(false);
  const [isPixelExploded, setIsPixelExploded] = useState(false);
  const [tilt, setTilt] = useState({ x: 10, y: -12 });
  const containerRef = useRef(null);

  // Very gentle, silky-smooth mouse tilt (heavily damped to fix high sensitivity)
  const handleMouseMove = (e) => {
    if (!is3D || isCinematicOrbit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: 10 - y * 6,   // Reduced from 16 to 6
      y: -12 + x * 8   // Reduced from 24 to 8
    });
  };

  const handleMouseLeave = () => {
    if (!isCinematicOrbit) {
      setTilt({ x: 10, y: -12 });
    }
  };

  const step = currentStep || {};
  const vType = step.visualType || 'image_normalize';
  const sId = scenario.id;

  // Decide suspect image based on scenario
  const getSuspectImage = () => {
    if (sId === 'classical') return catCrop50;
    if (sId === 'ai_light') return catMask;
    if (sId === 'heavy_sibling') return catFlip;
    return catOrig;
  };

  return (
    <div className="dt-viewport-container cinematic-container">
      {/* Viewport Top Bar Controls */}
      <div className="dt-viewport-header">
        <div className="dt-view-title">
          <span className="dt-pulse-dot" />
          <strong>CINEMATIC DIGITAL TWIN THEATER</strong>
          <span className="dt-stage-tag">{step.code || 'STAGE'}</span>
          <span className="dt-mode-tag">FRAME-BY-FRAME FORENSIC SCANNER</span>
        </div>

        <div className="dt-viewport-actions">
          <button
            className={`dt-view-btn ${isPixelExploded ? 'active' : ''}`}
            onClick={() => setIsPixelExploded((p) => !p)}
            title="Inspect underlying pixel calculations"
          >
            {isPixelExploded ? '✕ Collapse Pixels' : '🔬 Explode Pixels'}
          </button>
          <button
            className={`dt-view-btn ${isCinematicOrbit ? 'active' : ''}`}
            onClick={() => setIsCinematicOrbit((o) => !o)}
            title="Auto-orbit camera around 3D hologram"
          >
            🎥 {isCinematicOrbit ? 'Stop Orbit' : 'Camera Orbit'}
          </button>
          <button
            className={`dt-view-btn ${is3D ? 'active' : ''}`}
            onClick={() => { setIs3D(true); setIsCinematicOrbit(false); }}
            title="3D Isometric Perspective"
          >
            3D Holo
          </button>
          <button
            className={`dt-view-btn ${!is3D ? 'active' : ''}`}
            onClick={() => { setIs3D(false); setIsCinematicOrbit(false); }}
            title="Flat 2D Schematic"
          >
            2D Direct
          </button>
        </div>
      </div>

      {/* Main Cinematic 3D Theater Stage */}
      <div
        className="dt-stage-area cinematic-theater"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Holographic Laser Scanner Line */}
        <div className="dt-holo-scanner" />

        {/* Cinematic 3D Rotator */}
        <div
          className={`dt-stage-perspective ${is3D ? 'mode-3d' : 'mode-2d'} ${isCinematicOrbit ? 'camera-orbiting' : ''}`}
          style={is3D && !isCinematicOrbit ? { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` } : {}}
        >
          {/* Ambient 3D Cyber Floor */}
          <div className="dt-plane dt-floor-grid" />

          {/* ==================== STAGE 1: INPUT IMAGE & PIXEL DECOMPOSITION ==================== */}
          <div className={`dt-plane dt-layer-base ${isPixelExploded ? 'exploded' : ''}`}>
            <div className="dt-plane-label">
              <span>INPUT FRAME</span> {sId === 'registration' ? 'Original Upload' : 'Suspect Stream'}
            </div>

            <div className="dt-img-wrap cinematic-img-wrap">
              <img
                src={getSuspectImage()}
                alt="Active Frame"
                className={`dt-img ${isPixelExploded ? 'pixelated-blur' : ''}`}
              />

              {/* Exploded Pixel Matrix Overlay */}
              {isPixelExploded && (
                <div className="dt-pixel-explode-overlay">
                  <div className="dt-explode-grid">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const r = 40 + (i * 17) % 180;
                      const g = 60 + (i * 23) % 160;
                      const b = 90 + (i * 29) % 150;
                      return (
                        <div key={i} className="dt-explode-pixel" style={{
                          backgroundColor: `rgb(${r}, ${g}, ${b})`,
                          animationDelay: `${(i % 8) * 40}ms`
                        }}>
                          <small>{r}</small>
                        </div>
                      );
                    })}
                  </div>
                  <div className="dt-explode-banner">
                    RGB LUMINANCE MATRIX: f(x, y) DECOMPOSED
                  </div>
                </div>
              )}

              {/* Scanning Target Crosshairs */}
              <div className="dt-hud-target target-cat">
                <span className="target-ring" />
                <span className="target-tag">TARGET A: CAT SILHOUETTE (ROI)</span>
              </div>
              <div className="dt-hud-target target-pillar">
                <span className="target-ring" />
                <span className="target-tag">TARGET B: STONE PILLAR (ANCHOR)</span>
              </div>

              {/* Laser Sweep Beam */}
              <div className="dt-laser-sweep" />
            </div>

            <div className="dt-plane-meta">
              <span>Resolution: 1024×1024 px</span>
              <span>EXIF Tag 274: Transposed</span>
            </div>
          </div>

          {/* ==================== STAGE 2: LIVE ALGORITHMIC TRANSFORMATION ==================== */}
          <div className="dt-plane dt-layer-process cinematic-process">
            <div className="dt-plane-label">
              <span>COMPUTATION</span> Algorithm Execution Engine
            </div>

            {/* Visual 1: pHash Frequency Transform */}
            {vType === 'dct_mosaic' && (
              <div className="dt-mosaic-view cinematic-calc-view">
                <div className="dt-calc-hud">
                  <span>DISCRETE COSINE TRANSFORM (2D-DCT)</span>
                  <code>F(u, v) = ∑∑ f(x, y) · cos(...)</code>
                </div>
                <div className="dt-mosaic-grid cinematic-grid">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const val = Math.max(15, Math.floor(255 - (row + col) * 16));
                    const isBitOn = (i * 7 + 3) % 11 > 4;
                    return (
                      <span
                        key={i}
                        className={`dt-dct-cell ${isBitOn ? 'bit-on pulse' : ''}`}
                        style={{
                          backgroundColor: `rgb(${val}, ${val}, ${val})`,
                          animationDelay: `${i * 18}ms`
                        }}
                      >
                        {isBitOn ? '1' : '0'}
                      </span>
                    );
                  })}
                </div>
                <div className="dt-mosaic-stream">
                  STREAMING 64-BIT BINARY MATRIX: <code>10100011 11111000 10010000 11000010...</code>
                </div>
              </div>
            )}

            {/* Visual 2: CLIP & DINOv2 Deep Vectors */}
            {(vType === 'vector_space' || vType === 'vector_search') && (
              <div className="dt-vector-view cinematic-calc-view">
                <div className="dt-calc-hud">
                  <span>TRANSFORMER PATCH TENSORS</span>
                  <code>ViT-B/32 (512-d) ∪ DINOv2 (384-d × 5)</code>
                </div>
                <div className="dt-vector-bars cinematic-bars">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const h = 25 + Math.abs(Math.sin(i * 0.4) * 70);
                    const isPos = i % 3 !== 0;
                    return (
                      <div key={i} className="dt-vbar-col">
                        <span
                          className={`dt-vbar ${isPos ? 'pos' : 'neg'} animated-bar`}
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 25}ms`
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="dt-vector-stream">
                  COSINE SIMILARITY: <strong style={{ color: '#10b981' }}>0.941</strong> · RANK: <strong>#1 of 713 Works</strong>
                </div>
              </div>
            )}

            {/* Visual 3: SIFT Keypoints & MAGSAC Homography Mesh */}
            {(vType === 'sift_points' || vType === 'homography_mesh') && (
              <div className="dt-sift-view cinematic-sift-view">
                <div className="dt-calc-hud">
                  <span>MAGSAC++ PERSPECTIVE HOMOGRAPHY</span>
                  <code>[x', y', 1]ᵀ ~ H₃ₓ₃ × [x, y, 1]ᵀ</code>
                </div>
                <img
                  src={sId === 'classical' ? catCrop50 : catOrig}
                  alt="Feature Extrema"
                  className="dt-img-faint"
                />
                <svg className="dt-sift-svg" viewBox="0 0 100 100">
                  {/* Stable Inliers on Pillar & Floor */}
                  <circle cx="26" cy="32" r="2.2" className="dt-sift-node anchor" />
                  <circle cx="32" cy="40" r="2.5" className="dt-sift-node anchor" />
                  <circle cx="48" cy="62" r="3.0" className="dt-sift-node cat" />
                  <circle cx="52" cy="74" r="2.2" className="dt-sift-node cat" />
                  <circle cx="68" cy="44" r="2.5" className="dt-sift-node foliage" />
                  <circle cx="74" cy="54" r="2.0" className="dt-sift-node foliage" />
                  <circle cx="82" cy="68" r="2.2" className="dt-sift-node ground" />
                  <circle cx="20" cy="78" r="2.5" className="dt-sift-node ground" />

                  {/* Dynamic Mesh Lines */}
                  <polygon
                    points="26,32 68,44 82,68 48,62"
                    className="dt-mesh-poly animated-poly"
                  />
                  <line x1="26" y1="32" x2="48" y2="62" className="dt-mesh-line" />
                  <line x1="32" y1="40" x2="74" y2="54" className="dt-mesh-line" />
                  <line x1="20" y1="78" x2="82" y2="68" className="dt-mesh-line" />
                </svg>
                <div className="dt-matrix-hud">
                  <code>H = [ [ 1.002, 0.001, -12.4 ], [ -0.001, 0.998, 4.1 ], [ 0.000, 0.000, 1.000 ] ]</code>
                </div>
              </div>
            )}

            {/* Visual 4: Optical Flow Velocity Field */}
            {vType === 'optical_flow' && (
              <div className="dt-flow-view cinematic-flow-view">
                <div className="dt-calc-hud">
                  <span>DIS DENSE INVERSE SEARCH FLOW</span>
                  <code>Displacement Vector (u, v) on 1024px Grid</code>
                </div>
                <img src={catMask} alt="Flow Mask" className="dt-img-faint" />
                <div className="dt-flow-vectors-cinematic">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className="dt-flow-arrow-animated"
                      style={{
                        top: `${12 + (i % 7) * 12}%`,
                        left: `${15 + Math.floor(i / 7) * 22}%`,
                        transform: `rotate(${i * 12}deg)`,
                        animationDelay: `${i * 50}ms`
                      }}
                    >
                      ➔
                    </span>
                  ))}
                </div>
                <div className="dt-flow-hud">
                  <span>MEDIAN DISPLACEMENT: <strong>0.38 px</strong></span>
                  <span>HIGH-PASS CORR: <strong>0.941</strong></span>
                </div>
              </div>
            )}

            {/* Visual 5: Hash Chain Ledger */}
            {vType === 'hash_chain_block' && (
              <div className="dt-chain-view cinematic-chain-view">
                <div className="dt-block-card cinematic-block">
                  <div className="dt-block-tag">BLOCK #714 (ACTIVE LEDGER)</div>
                  <div className="dt-block-hash">
                    <small>ENTRY SHA-256 HASH:</small>
                    <code>9b82f01f...d8a23e91</code>
                  </div>
                  <div className="dt-block-prev">
                    <small>PREVIOUS BLOCK ROOT:</small>
                    <code>4e71a09c...11c42f00</code>
                  </div>
                  <div className="dt-block-merkle">
                    <small>CANONICAL FIELDS:</small>
                    <span>ID · CREATOR · TITLE · PHASH · CLIP-512 · TIMESTAMP</span>
                  </div>
                </div>
                <div className="dt-chain-status">
                  ✓ Cryptographically Chained to Genesis Block
                </div>
              </div>
            )}

            {/* Fallback for Normalization / Security stages */}
            {(!['dct_mosaic', 'vector_space', 'vector_search', 'sift_points', 'homography_mesh', 'optical_flow', 'hash_chain_block'].includes(vType)) && (
              <div className="dt-generic-mesh cinematic-scanner-active">
                <div className="dt-calc-hud">
                  <span>SECURITY NORMALIZATION</span>
                  <code>Decompression Bomb Guard + EXIF Orientation</code>
                </div>
                <div className="dt-scan-lines-wrap">
                  <img src={getSuspectImage()} alt="Analysis frame" className="dt-img-faint" />
                  <div className="dt-scanner-bar animated-laser" />
                </div>
                <div className="dt-stream-terminal">
                  <code>[PASS] 0.71 MP &lt; 89 MP Cap</code><br />
                  <code>[PASS] Color Matrix Normalized (sRGB)</code>
                </div>
              </div>
            )}
          </div>

          {/* ==================== STAGE 3: HARDCODED FORENSIC OUTPUT (ZERO LATENCY) ==================== */}
          <div className="dt-plane dt-layer-output cinematic-output">
            <div className="dt-plane-label">
              <span>FORENSIC ARTIFACT</span> Verified Derivation Proof
            </div>

            {/* 1. Registration Step 1: Normalized Master Frame */}
            {step.code === 'REG_01' && (
              <div className="dt-output-card tier1">
                <img src={catOrig} alt="Master Ingestion Canvas" className="dt-img" />
                <div className="dt-verdict-overlay success">
                  <strong>INGESTION VERIFIED · 1024×1024</strong>
                  <span>EXIF Orientation Corrected · Safe sRGB Canvas</span>
                </div>
              </div>
            )}

            {/* 2. Registration Step 2: 64-Bit pHash Registered */}
            {step.code === 'REG_02' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">PERCEPTUAL FINGERPRINT STORED</span>
                  <div className="artifact-hex">a3f890c2e4719b0d</div>
                  <div className="artifact-sub">
                    64 bits unpacked in in-memory Hamming index.<br />
                    Bit density: 31 on / 33 off · Texture RMS: 28.4
                  </div>
                  <span className="artifact-badge verified">✓ READY FOR SEARCH</span>
                </div>
              </div>
            )}

            {/* 3. Registration Step 3: Dual Embedding Vectors Stored */}
            {step.code === 'REG_03' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">DUAL VECTOR TENSOR STORED</span>
                  <div className="artifact-stat-row">
                    <div><span>CLIP ViT-B/32:</span><strong>512 floats</strong></div>
                    <div><span>DINOv2:</span><strong>384 floats × 5</strong></div>
                  </div>
                  <div className="artifact-sub">
                    L2 Normalized on unit sphere.<br />
                    Pre-indexed into vector search matrix.
                  </div>
                  <span className="artifact-badge verified">✓ INDEXED IN REGISTRY</span>
                </div>
              </div>
            )}

            {/* 4. Registration Step 4: SIFT Feature Cache */}
            {step.code === 'REG_04' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">LOCAL KEYPOINT CACHE</span>
                  <div className="artifact-stat-row">
                    <div><span>Extrema Keypoints:</span><strong>1,420 pts</strong></div>
                    <div><span>Descriptor Depth:</span><strong>128 dims</strong></div>
                  </div>
                  <div className="artifact-sub">
                    Cached in MongoDB (collection: works.sift_cache).<br />
                    Sub-second geometric verification enabled.
                  </div>
                  <span className="artifact-badge verified">✓ KEYPOINT CACHE BUILT</span>
                </div>
              </div>
            )}

            {/* 5. Registration Step 5: Hash Chain Receipt */}
            {step.code === 'REG_05' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">IMMUTABLE BLOCK CHAIN RECEIPT</span>
                  <div className="artifact-hex">9b82f01f42a0...e891</div>
                  <div className="artifact-sub">
                    Block #714 sealed in sequence.<br />
                    Tamper-evident mathematical linkage guaranteed.
                  </div>
                  <span className="artifact-badge verified">✓ CHAIN LINK SEALED</span>
                </div>
              </div>
            )}

            {/* 6. Registration Step 6 / Certificate: Official PDF Certificate */}
            {(step.code === 'REG_06' || vType === 'certificate_pdf') && (
              <div className="dt-output-card cert">
                <div className="dt-cert-preview cinematic-cert">
                  <div className="dt-cert-head">
                    <span>PROVENANCE CERTIFICATE</span>
                    <span className="dt-cert-qr">■■</span>
                  </div>
                  <div className="dt-cert-id">WORK ID: #38906 · 2-PAGE PDF</div>
                  <div className="dt-cert-ots">
                    <span>Bitcoin Merkle Root: <strong>CONFIRMED</strong></span>
                    <span>OTS Proof: <strong>record-38906.json.ots</strong></span>
                  </div>
                  <div className="dt-cert-seal">LEGAL PROVENANCE SECURED</div>
                </div>
              </div>
            )}

            {/* 7. Classical Verification Stages: Retrieval & Alignment */}
            {(step.code === 'G0' || step.code === 'G1') && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">VECTOR RETRIEVAL: RANK #1</span>
                  <div className="artifact-stat-row">
                    <div><span>Target Match:</span><strong>Work #38906</strong></div>
                    <div><span>CLIP Sim:</span><strong>0.941</strong></div>
                  </div>
                  <div className="artifact-sub">
                    Multi-orientation search retrieved true original.<br />
                    Candidate passed to Stage G2 Geometry Guard.
                  </div>
                  <span className="artifact-badge verified">✓ RETRIEVAL CONFIRMED</span>
                </div>
              </div>
            )}

            {step.code === 'G2' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">HOMOGRAPHY MATRIX VERIFIED</span>
                  <div className="artifact-stat-row">
                    <div><span>MAGSAC Inliers:</span><strong>312 pairs</strong></div>
                    <div><span>Reproj Error:</span><strong>0.84 px</strong></div>
                  </div>
                  <div className="artifact-sub">
                    Crop containment geometry PASSED (50% crop).<br />
                    Stable perspective alignment locked.
                  </div>
                  <span className="artifact-badge verified">✓ GEOMETRY VERIFIED</span>
                </div>
              </div>
            )}

            {step.code === 'G3' && (
              <div className="dt-output-card tier1">
                <div className="dt-hardcoded-artifact">
                  <span className="artifact-title">DENSE FLOW & RESIDUAL METRICS</span>
                  <div className="artifact-stat-row">
                    <div><span>Median Flow:</span><strong>0.38 px</strong></div>
                    <div><span>Residual p90:</span><strong>4.2 / 255</strong></div>
                  </div>
                  <div className="artifact-sub">
                    Sub-pixel motion agreement across canvas.<br />
                    Color tone curve balanced.
                  </div>
                  <span className="artifact-badge verified">✓ DENSE AGREEMENT</span>
                </div>
              </div>
            )}

            {/* 8. Final Tier 1 Evidence Heatmap */}
            {(step.code === 'G4_G5' || vType === 'heatmap_tier1') && (
              <div className="dt-output-card tier1">
                <img src={catHeatmap} alt="Tier 1 Heatmap" className="dt-img" />
                <div className="dt-verdict-overlay success">
                  <strong>TIER 1 · CONCLUSIVE PIXEL DERIVATION</strong>
                  <span>Residual p90: 4.2 · Edge Corr: 0.941 · Flow: 0.38 px</span>
                </div>
              </div>
            )}

            {/* 9. Tier 2 Localized AI Inpainting Heatmap */}
            {(sId === 'ai_light' || vType === 'heatmap_ai') && (
              <div className="dt-output-card tier2">
                <img src={catMask} alt="Tier 2 Inpainting Mask" className="dt-img" />
                <div className="dt-verdict-overlay warning">
                  <strong>TIER 2 (RELATED LEAD)</strong>
                  <span>AI Inpainting Localized: 14.8% altered · Background intact</span>
                </div>
              </div>
            )}

            {/* 10. Heavy AI Rejection / No Claim */}
            {(step.code === 'CASE_A' || step.code === 'DECISION_A' || vType === 'heavy_ai_reject' || vType === 'no_claim_state') && (
              <div className="dt-output-card neutral">
                <div className="dt-no-claim-box">
                  <span className="dt-alert-icon">🛡️</span>
                  <strong>NO CLAIM (HONEST BOUNDARY)</strong>
                  <p>Inlier Keypoints: 2 (Threshold: 12). Zero geometric derivation. False accusation prevented.</p>
                </div>
              </div>
            )}

            {/* 11. Sibling Capture Lead */}
            {(step.code === 'CASE_B' || step.code === 'DECISION_B' || vType === 'sibling_burst' || vType === 'related_lead') && (
              <div className="dt-output-card lead">
                <div className="dt-no-claim-box lead-box">
                  <span className="dt-alert-icon">📸</span>
                  <strong>RELATED DIFFERENT CAPTURE</strong>
                  <p>Sensor Noise NCC: 0.04 (Independent shutter). Same scene, separate photo.</p>
                </div>
              </div>
            )}
          </div>

          {/* Glowing 3D Energy Rays */}
          <div className="dt-energy-beam beam-1" />
          <div className="dt-energy-beam beam-2" />
        </div>
      </div>

      {/* Floating Interactive Tech Badges */}
      <div className="dt-tech-strip">
        <span className="dt-strip-label">Click any technology to inspect mathematical algorithm:</span>
        <div className="dt-strip-badges">
          {(step.tech || []).map((tKey) => {
            const spec = TECH_SPECS[tKey];
            if (!spec) return null;
            return (
              <button
                key={tKey}
                className="dt-tech-chip"
                onClick={() => onInspectTech(tKey)}
              >
                <span className="dt-chip-dot" />
                <strong>{spec.name.split(' (')[0]}</strong>
                <span className="dt-chip-cat">{spec.category}</span>
                <span className="dt-chip-inspect">Inspect ➔</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
