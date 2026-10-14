/**
 * Digital Twin Pipeline Simulation Data & Knowledge Base
 * Powers the interactive 3D digital twin visualization and technical deep-dives.
 */

export const SCENARIOS = [
  {
    id: 'registration',
    title: 'Asset Registration & Blockchain Anchoring',
    subtitle: 'From Raw Creator Upload to Bitcoin-Anchored Legal Provenance',
    badge: 'Registration Flow',
    description: 'When an artist registers an artwork, we ingest it safely, extract six independent classical and learned representations, commit it to a tamper-proof SHA-256 hash chain, and anchor it in Bitcoin.',
    steps: [
      {
        stepIndex: 1,
        code: 'REG_01',
        title: 'Ingestion & Security Normalization',
        tech: ['pil', 'exif'],
        summary: 'Decompression-bomb protection, EXIF orientation correction, and strict RGB color transposition.',
        explanation: 'Images uploaded from digital cameras or smartphones often carry EXIF rotation tags (e.g. portrait orientation recorded as landscape with tag 6). If unhandled, this produces disparate perceptual hashes. We normalize orientation via ImageOps.exif_transpose and guard against zip-bomb payloads (>89M pixels).',
        metrics: { 'Decompression Cap': '89 MP', 'Color Space': 'sRGB 8-bit', 'Max Buffer': '20 MB' },
        visualType: 'image_normalize',
        activeTech: 'pil'
      },
      {
        stepIndex: 2,
        code: 'REG_02',
        title: 'Classical Perceptual Hashing (pHash)',
        tech: ['phash'],
        summary: 'Extracting a 64-bit low-frequency Discrete Cosine Transform (DCT) fingerprint.',
        explanation: 'The image is converted to grayscale, downsampled to a 32x32 luminance grid, and transformed into the frequency domain using 2D DCT. The top-left 8x8 low-frequency matrix (capturing global structure while discarding high-frequency noise) is compared against its median to yield a 64-bit binary bitstring.',
        metrics: { 'DCT Block Size': '32×32 px', 'Selected Frequencies': '8×8 (Low-freq)', 'Hash Output': '64 bits' },
        visualType: 'dct_mosaic',
        activeTech: 'phash'
      },
      {
        stepIndex: 3,
        code: 'REG_03',
        title: 'Dual Semantic & Structural Embeddings',
        tech: ['clip', 'dinov2'],
        summary: 'Projecting into 512-d OpenCLIP semantic space and 384-d DINOv2 self-supervised patch space.',
        explanation: 'We extract dual high-dimensional representations: OpenCLIP (ViT-B/32) captures holistic scene semantics and artistic style, while Meta DINOv2 (ViT-S/14) extracts 5 multi-crop patch vectors capturing fine-grained localized subject structure invariant to lighting and background changes.',
        metrics: { 'CLIP Vector': '512 floats (L2)', 'DINOv2 Vector': '384 floats × 5 crops', 'Inference Latency': '220 ms (CPU)' },
        visualType: 'vector_space',
        activeTech: 'clip'
      },
      {
        stepIndex: 4,
        code: 'REG_04',
        title: 'Local Feature Extraction & Caching',
        tech: ['sift'],
        summary: 'Extracting scale-space extrema keypoints and 128-d gradient orientation descriptors.',
        explanation: 'OpenCV SIFT identifies scale-space extrema across Gaussian difference octaves. Keypoints with high contrast and edge-stability receive 128-dimensional orientation histograms. These descriptors are pre-cached in MongoDB for instantaneous sub-second geometric matching during future copy checks.',
        metrics: { 'Detected Keypoints': '1,420 pts', 'Descriptor Depth': '128-d float', 'Scale Invariance': 'Scale-Space Octaves' },
        visualType: 'sift_points',
        activeTech: 'sift'
      },
      {
        stepIndex: 5,
        code: 'REG_05',
        title: 'Cryptographic Hash Chain Commitment',
        tech: ['hash_chain'],
        summary: 'Appending work to a linear SHA-256 blockchain ledger linking to the genesis block.',
        explanation: 'Every registration is cryptographically chained. The entry hash is calculated over the canonical JSON of: ID, creator name, title, pHash, raw 512-d embedding vector, timestamp, and previous entry hash (prev_hash). Modifying any past registration breaks the entire mathematical chain.',
        metrics: { 'Algorithm': 'SHA-256 Canonical JSON', 'Ledger Type': 'Sequential Hash Chain', 'Genesis Linked': 'True' },
        visualType: 'hash_chain_block',
        activeTech: 'hash_chain'
      },
      {
        stepIndex: 6,
        code: 'REG_06',
        title: 'Bitcoin Anchoring & Dual-Page Certificate',
        tech: ['opentimestamps', 'certificate'],
        summary: 'Submitting Merkle root to Bitcoin calendar nodes and generating verifiable PDF certificate.',
        explanation: 'The entry hash is committed to the Bitcoin blockchain using OpenTimestamps (.ots), providing cryptographically immutable mathematical proof of existence at a specific block height. The system compiles a 2-page PDF certificate with a public QR verification endpoint.',
        metrics: { 'Blockchain Network': 'Bitcoin Mainnet', 'Proof Format': 'OpenTimestamps (.ots)', 'Verification Link': 'Public /verify/<id>' },
        visualType: 'certificate_pdf',
        activeTech: 'opentimestamps'
      }
    ]
  },
  {
    id: 'classical',
    title: 'Classical Alterations & Crops (Tier 1 Evidence)',
    subtitle: 'Catching 50% Crops, Rotations, Flips, and Heavy Compression',
    badge: 'Tier 1 Derivation',
    description: 'When an infringer crops down to 10%, mirrors, or heavily compresses an artwork, our geometric gate aligns the suspect onto the original and proves derivation down to the individual pixel.',
    steps: [
      {
        stepIndex: 1,
        code: 'G0',
        title: 'Border Trimming & Normalization',
        tech: ['pil'],
        summary: 'Stripping letterbox borders, transparent canvas padding, and recording suspect bounds.',
        explanation: 'Art thieves often pad images with white/black bars to confuse aspect-ratio matching. Stage G0 auto-trims monochrome borders, normalizes EXIF orientation, and preserves the true underlying canvas.',
        metrics: { 'Crop Box Trimmed': '12% letterbox removed', 'Aspect Ratio': 'Locked (Original Frame)' },
        visualType: 'crop_trim',
        activeTech: 'pil'
      },
      {
        stepIndex: 2,
        code: 'G1',
        title: 'Multi-Orientation Vector Retrieval',
        tech: ['clip', 'dinov2'],
        summary: 'Querying in 3 orientations (as-is, mirrored, flipped) with multi-crop DINOv2 scoring.',
        explanation: 'To catch flipped copies, G1 embeds the suspect in normal, horizontal-flip, and vertical-flip orientations in a single batched pass. The union of top-k candidates across CLIP and DINOv2 guarantees the original is retrieved even under severe cropping.',
        metrics: { 'Candidate Candidates': 'Top-8 retrieved', 'True Original Rank': 'Rank #1 (Score 0.941)' },
        visualType: 'vector_search',
        activeTech: 'dinov2'
      },
      {
        stepIndex: 3,
        code: 'G2',
        title: 'SIFT + MAGSAC++ Homography Fitting',
        tech: ['sift', 'magsac'],
        summary: 'Dual-pass feature matching and robust projectivity estimation with crop containment check.',
        explanation: 'We match SIFT keypoints using Lowe’s ratio test and solve the 3×3 projective homography matrix H via MAGSAC++. Crucially, our containment geometry check verifies that the bounding box of the cropped suspect is geometrically bounded within the original canvas.',
        metrics: { 'Inlier Matches': '312 keypoint pairs', 'Reprojection Error': '0.84 px (Tightly locked)', 'Homography Matrix': 'Valid Perspective 3×3' },
        visualType: 'homography_mesh',
        activeTech: 'magsac'
      },
      {
        stepIndex: 4,
        code: 'G3',
        title: 'Photometric Warp & Dense Optical Flow',
        tech: ['dense_flow', 'photometric'],
        summary: '1024px reference warp, tone-curve balancing, and DIS sub-pixel motion measurement.',
        explanation: 'The suspect is warped into the original’s 1024px coordinate system. A 3×3 color transformation matrix and non-linear tone curve are fitted to compensate for Instagram/WhatsApp compression. Dense Inverse Search (DIS) optical flow evaluates pixel displacement vectors only on textured areas.',
        metrics: { 'Warp Frame': '1024×1024 RGB', 'Flow Median': '0.38 px (Near-zero motion)', 'Residual p90': '4.2 intensity levels' },
        visualType: 'optical_flow',
        activeTech: 'dense_flow'
      },
      {
        stepIndex: 5,
        code: 'G4_G5',
        title: 'Tier 1 Classification & Evidence Packet',
        tech: ['evidence'],
        summary: 'Conclusive pixel proof verdict with aligned overlay and difference heatmap.',
        explanation: 'Because the homography is stable, residual error is under the strict threshold, and optical flow is sub-pixel, the system outputs TIER 1 EVIDENCE. An aligned side-by-side overlay, an inlier tie-line SVG, and an intensity heatmap are saved for DMCA takedowns.',
        metrics: { 'Verdict': 'TIER 1 (Conclusive Evidence)', 'False Positive Rate': '0.0% (Verified)', 'Claim Grade': 'Legal Evidence' },
        visualType: 'heatmap_tier1',
        activeTech: 'evidence'
      }
    ]
  },
  {
    id: 'ai_light',
    title: 'Localized AI Edits & Inpainting (Tier 2 Lead)',
    subtitle: 'Pinpointing AI Restyles, Inpainted Objects, and Modified Backgrounds',
    badge: 'Tier 2 Lead',
    description: 'When an AI tool (like Photoshop Generative Fill or Midjourney inpainting) alters part of an artwork, the gate locks onto the unchanged anchor geometry and illuminates the altered region on a forensic heatmap.',
    steps: [
      {
        stepIndex: 1,
        code: 'G1_AI',
        title: 'Semantic Affinity Detection',
        tech: ['clip', 'dinov2'],
        summary: 'Retrieving original based on surviving semantic composition and style.',
        explanation: 'Even when parts of the subject are modified by AI, OpenCLIP and DINOv2 capture the shared scene composition, lighting, and surviving elements (e.g. the architectural pillar and tiled floor in our cat sample).',
        metrics: { 'CLIP Similarity': '0.812 (High affinity)', 'Candidate Rank': '#1 in Top-k' },
        visualType: 'vector_search',
        activeTech: 'clip'
      },
      {
        stepIndex: 2,
        code: 'G2_AI',
        title: 'Anchor-Based Geometric Alignment',
        tech: ['sift', 'magsac'],
        summary: 'SIFT keypoints discard the hallucinated pixels and anchor to surviving structures.',
        explanation: 'Generative AI destroys pixel gradients in the regenerated area, but the untouched background features retain crisp scale-space extrema. MAGSAC++ isolates inliers purely on the genuine background, calculating the exact homography.',
        metrics: { 'Background Inliers': '164 verified pairs', 'Altered Region Inliers': '0 (Filtered out by MAGSAC++)' },
        visualType: 'homography_mesh',
        activeTech: 'sift'
      },
      {
        stepIndex: 3,
        code: 'G3_AI',
        title: 'Dense Residual Anomaly Localization',
        tech: ['dense_flow', 'photometric'],
        summary: 'Dense optical flow detects localized divergence exclusively over the AI-edited zones.',
        explanation: 'After warping and photometric tone compensation, the untouched regions show near-zero pixel residual (< 5). However, over the AI-inpainted cat body, the optical flow vectors diverge wildly (> 18 px) and the high-pass correlation drops.',
        metrics: { 'Background Residual': '3.8 (Agrees pixel-for-pixel)', 'Inpainted Residual': '48.2 (Massive anomaly)', 'Altered Canvas Area': '14.8%' },
        visualType: 'optical_flow',
        activeTech: 'dense_flow'
      },
      {
        stepIndex: 4,
        code: 'G4_AI',
        title: 'Tier 2 Verdict & Forensic Heatmap',
        tech: ['evidence'],
        summary: 'Graded as Related Lead with human review required, generating pinpoint heatmap.',
        explanation: 'Rather than falsely claiming identical pixel proof (Tier 1), the pipeline accurately classifies this as TIER 2 (Shadow Related Lead). The forensic heatmap highlights the exact AI-altered bounding area in vivid red while rendering the untouched ground in deep blue.',
        metrics: { 'Verdict': 'TIER 2 (Related Lead)', 'Notice Grade': 'Lead, not absolute proof', 'Human Review': 'Mandatory Required' },
        visualType: 'heatmap_ai',
        activeTech: 'evidence'
      }
    ]
  },
  {
    id: 'heavy_sibling',
    title: 'Heavy AI Regeneration & Sibling Bursts (Honest Boundary)',
    subtitle: 'Why Honest Systems Reject Hallucinations & Distinguish Camera Bursts',
    badge: 'Honest Boundary',
    description: 'Understanding the physical limits of computer vision: why completely regenerated prompts yield "No Claim" to prevent false legal claims, and how the pipeline prevents false alarms on multi-shot camera bursts.',
    steps: [
      {
        stepIndex: 1,
        code: 'CASE_A',
        title: 'Heavy Generative Regeneration (Case 1)',
        tech: ['sift', 'magsac'],
        summary: 'Complete style/pose re-render using original only as a conceptual prompt.',
        explanation: 'When someone asks Midjourney or Flux to create a new cat in the same pose, zero pixels or keypoints are shared. Holistic similarity might show faint correlation, but G2 MAGSAC++ finds fewer than 4 consistent geometric inliers. The homography fails.',
        metrics: { 'SIFT Inlier Count': '2 (Below threshold 12)', 'Homography Status': 'REJECTED: No credible geometry' },
        visualType: 'heavy_ai_reject',
        activeTech: 'magsac'
      },
      {
        stepIndex: 2,
        code: 'DECISION_A',
        title: 'Honest Boundary: "No Claim"',
        tech: ['evidence'],
        summary: 'System cleanly refuses to issue a false copyright claim.',
        explanation: 'Competitor tools that rely purely on CLIP similarity falsely accuse artists whose work happens to share an artistic theme. Our pipeline honors an honest information ceiling: without geometric derivation, the system outputs NO CLAIM, protecting creators from liability.',
        metrics: { 'Verdict': 'NO CLAIM', 'False Accusations': '0.0%', 'System Integrity': 'Preserved' },
        visualType: 'no_claim_state',
        activeTech: 'evidence'
      },
      {
        stepIndex: 3,
        code: 'CASE_B',
        title: 'Camera Burst Sibling Negatives (Case 2)',
        tech: ['dense_flow'],
        summary: 'Two consecutive photos of the same scene taken 1 second apart.',
        explanation: 'A photographer takes two burst shots of the cat. The pillar and ledge match, but micro-head motion, wind, and sensor photon noise differ. While naive perceptual hashing gives 95% similarity, our pipeline analyzes flat-tile noise correlation (noise_ncc).',
        metrics: { 'Semantic Sim': '0.96 (High)', 'Sensor Noise NCC': '0.04 (Independent sensors/shots)', 'Relation': 'Sibling Capture' },
        visualType: 'sibling_burst',
        activeTech: 'dense_flow'
      },
      {
        stepIndex: 4,
        code: 'DECISION_B',
        title: 'Graded as "Related Different Capture"',
        tech: ['evidence'],
        summary: 'Flagged as an investigative lead, never falsely claimed as stolen evidence.',
        explanation: 'The system recognizes the shared scene composition but accurately determines that this is a separate photograph of the same subject. It issues a RELATED_DIFFERENT_CAPTURE notice requiring human inspection, ensuring zero false-positive evidence claims.',
        metrics: { 'Verdict': 'RELATED_DIFFERENT_CAPTURE', 'Evidence Claim': '0.0% (Zero false evidence)', 'Status': 'Human Review Requested' },
        visualType: 'related_lead',
        activeTech: 'evidence'
      }
    ]
  }
];

export const TECH_SPECS = {
  phash: {
    name: 'pHash (Discrete Cosine Transform)',
    role: 'Classical 64-Bit Structural Hash',
    category: 'Perceptual Fingerprinting',
    equation: 'F(u, v) = (1/4) · C(u) · C(v) · ∑ ∑ [ f(x, y) × cos((2x + 1)uπ / 64) × cos((2y + 1)vπ / 64) ]',
    plainFormula: 'Converts 32×32 pixel brightness into 2D frequency waves, discarding noise and keeping the 8×8 lowest frequencies to produce a 64-bit structural bitstring.',
    whatItIs: 'A frequency-domain perceptual hash that reduces an image to a compact 64-bit fingerprint based on low-frequency luminance energy rather than individual pixel colors.',
    howItWorks: 'The image is converted to grayscale, downsampled to 32×32 pixels, and transformed into 2D frequency space via Discrete Cosine Transform. The lowest-frequency 8×8 coefficients (excluding DC) capture fundamental shapes while ignoring noise. Each bit is set based on whether its coefficient exceeds the median energy.',
    whyWeChoseIt: [
      'Invariant to minor compression, slight color grading, and JPEG artifacts.',
      'Computes in under 3 milliseconds on CPU.',
      'Enables lightning-fast bitwise XOR Hamming distance search in memory.'
    ],
    comparison: [
      { name: 'Average Hash (aHash)', pro: 'Extremely fast', con: 'Only looks at mean brightness; fails if gamma or contrast is tuned', ourVerdict: 'Too brittle for real-world platforms' },
      { name: 'Difference Hash (dHash)', pro: 'Tracks horizontal gradients', con: 'Sensitive to rotation and horizontal flipping', ourVerdict: 'Good baseline, but pHash captures 2D frequency better' },
      { name: 'Wavelet Hash (wHash)', pro: 'Multi-resolution wavelets', con: 'Over-rewards identical backgrounds in different photos', ourVerdict: 'Tested and rejected due to false sibling matches' },
      { name: 'DCT pHash (Our Choice)', pro: 'Optimal balance of structural stability and speed', con: 'Fails on severe crops and AI inpainting', ourVerdict: 'Selected as our classical Tier-1 anchor' }
    ]
  },
  clip: {
    name: 'OpenCLIP (ViT-B/32)',
    role: 'Semantic Global Vector Embedding',
    category: 'Deep Representation Learning',
    equation: 'Semantic_Similarity = ( Vector_Query · Vector_Target ) / ( ||Vector_Query|| × ||Vector_Target|| )',
    plainFormula: 'Cosine dot product between two 512-dimensional continuous vectors representing global scene semantics, lighting, and artistic concept.',
    whatItIs: 'A Vision Transformer trained on 2 billion image-text pairs (LAION-2B) that maps images into a 512-dimensional continuous conceptual vector space.',
    howItWorks: 'Images are preprocessed via Resize(224) and CenterCrop(224×224), then processed by a 12-layer Vision Transformer with 32×32 patch tokens. The final class token is projected into a 512-dimensional L2-normalized embedding where semantic distance correlates with cosine similarity.',
    whyWeChoseIt: [
      'High semantic recall: catches altered images even when pixel colors are heavily restyled.',
      'Standardized 512-d float vectors enable exact matrix-multiplication retrieval in milliseconds.',
      'Lightweight enough to run on CPU without needing an expensive dedicated GPU cluster.'
    ],
    comparison: [
      { name: 'ResNet-50 / CNNs', pro: 'Fast local convolutions', con: 'Lacks global semantic contextual attention', ourVerdict: 'Transformers offer superior cross-style robustness' },
      { name: 'CLIP ViT-L/14', pro: 'Higher zero-shot accuracy', con: '7× higher compute latency and 3× memory footprint', ourVerdict: 'ViT-B/32 provides the ideal latency/accuracy trade-off for CPU' },
      { name: 'OpenCLIP ViT-B/32 (Our Choice)', pro: '512-d L2 space, 220ms CPU inference, robust to styling', con: 'CenterCrop discards edges of tall portraits', ourVerdict: 'Paired with DINOv2 to solve edge cropping' }
    ]
  },
  dinov2: {
    name: 'Meta DINOv2 (ViT-S/14)',
    role: 'Fine-Grained Multi-Crop Structural Representation',
    category: 'Self-Supervised Vision Transformer',
    equation: 'DINO_Score = Max( Vector_Query · Vector_Crop[c] )   for c ∈ { top-left, top-right, center, bottom-left, bottom-right }',
    plainFormula: 'Extracts 1 global vector + 5 multi-crop localized patch vectors (384-dim each) to guarantee that zoomed or cropped regions match at Rank #1.',
    whatItIs: 'A self-supervised Vision Transformer developed by Meta that learns rich patch-level visual representations without relying on text labels.',
    howItWorks: 'DINOv2 uses small 14×14 patches to capture detailed geometric textures. During registration, we extract 1 global 384-d vector plus 5 localized crop vectors (corners and center). During search, we compute the maximum dot product across crop candidates.',
    whyWeChoseIt: [
      'Solves the CLIP CenterCrop limitation by explicitly indexing local spatial crops.',
      'Immune to the semantic drift of text labels; focuses on visual geometry.',
      'Multi-crop vectors ensure a 25% crop is retrieved at Rank #1 even in large registries.'
    ],
    comparison: [
      { name: 'CLIP Alone', pro: 'Understands scene context', con: 'Misses corner crops when resized to center 224px', ourVerdict: 'Insufficient on its own for small crops' },
      { name: 'MAE (Masked Autoencoders)', pro: 'Great pixel reconstruction', con: 'Poor global retrieval representation', ourVerdict: 'DINOv2 performs significantly better for copy detection' },
      { name: 'DINOv2 + Multi-Crop (Our Choice)', pro: 'Superior patch granularity, catches micro-crops', con: 'Requires computing 5 sub-vectors per image', ourVerdict: 'Essential companion to OpenCLIP' }
    ]
  },
  sift: {
    name: 'OpenCV SIFT (Scale-Invariant Feature Transform)',
    role: 'Local Invariant Keypoint Extraction',
    category: 'Geometric Computer Vision',
    equation: 'DoG(x, y, σ) = [ Gaussian_Blur(k·σ) - Gaussian_Blur(σ) ] ∗ Image(x, y)',
    plainFormula: 'Subtracts progressively blurred octaves to detect scale-invariant corners and textures, assigning 128-dimensional local gradient histograms to each point.',
    whatItIs: 'The gold standard for detecting local interest points that remain invariant to scale, rotation, illumination, and 3D camera viewpoint shifts.',
    howItWorks: 'Constructs a Difference of Gaussians (DoG) pyramid across octaves to locate stable extrema. Keypoints with low contrast or edge instability are eliminated. Each keypoint is assigned an orientation based on local image gradient directions, yielding a 128-dimensional feature vector.',
    whyWeChoseIt: [
      'Patent-free (since 2020) and universally supported in OpenCV.',
      'Unsurpassed stability under scale changes (from 10% micro-crops to 200% zooms).',
      'Descriptors pre-cached in database for instant sub-second verification.'
    ],
    comparison: [
      { name: 'ORB (Oriented FAST & Rotated BRIEF)', pro: 'Very fast binary descriptors', con: 'Fails under significant scale changes and zooms', ourVerdict: 'Failed our crop evaluation benchmark' },
      { name: 'AKAZE', pro: 'Non-linear scale space', con: 'Slower descriptor extraction, fewer keypoints on flat art', ourVerdict: 'SIFT yielded higher inlier density' },
      { name: 'SIFT (Our Choice)', pro: 'Proven scale/rotation mathematical invariance', con: 'Sparse on flat/vector logos (handled by our ECC fallback)', ourVerdict: 'The backbone of our geometric derivation proof' }
    ]
  },
  magsac: {
    name: 'MAGSAC++ (Marginalized Sample Consensus)',
    role: 'Robust Homography Matrix Solver',
    category: 'Robust Geometric Estimation',
    equation: '[ x\', y\', 1 ]ᵀ  ~  H₃ₓ₃ × [ x, y, 1 ]ᵀ   where H = [ [h₁₁, h₁₂, h₁₃], [h₂₁, h₂₂, h₂₃], [h₃₁, h₃₂, 1] ]',
    plainFormula: 'Marginalizes sample consensus over continuous noise scales to solve the 3×3 projective homography matrix relating two image planes without requiring a hardcoded inlier threshold.',
    whatItIs: 'A state-of-the-art robust estimator that calculates the 3×3 projective homography matrix relating two planes without requiring a strict user-defined inlier threshold.',
    howItWorks: 'Unlike classic RANSAC which uses an arbitrary binary threshold (e.g. 3 pixels), MAGSAC++ marginalizes over the noise scale sigma. It weighs all tentative matches probabilistically, ensuring that outliers and AI hallucinations are eliminated while true geometric inliers converge rapidly.',
    whyWeChoseIt: [
      'Handles extreme outlier ratios (>80% modified pixels in AI inpainting).',
      'Produces deterministic, mathematically optimal homography matrices.',
      'Includes our custom containment check to verify that crops fit strictly within the canvas.'
    ],
    comparison: [
      { name: 'Standard RANSAC (1981)', pro: 'Simple algorithm', con: 'Requires hardcoded threshold; unstable on mixed resolutions', ourVerdict: 'Outdated and prone to false negatives' },
      { name: 'USAC', pro: 'Fast parallel framework', con: 'Heavy parameter configuration', ourVerdict: 'MAGSAC++ demonstrated superior accuracy' },
      { name: 'MAGSAC++ (Our Choice)', pro: 'Threshold-free marginalization, optimal convergence', con: 'Slightly higher computation per iteration', ourVerdict: 'Enables 100% precision in homography alignment' }
    ]
  },
  dense_flow: {
    name: 'DIS Optical Flow & Photometric Normalization',
    role: 'Sub-Pixel Motion & Pixel Residual Measurement',
    category: 'Dense Forensic Computer Vision',
    equation: 'Displacement_Vector(x, y) = ( u(x, y), v(x, y) )   such that   I_suspect(x + u, y + v) ≈ ToneCorrected_Original(x, y)',
    plainFormula: 'Evaluates the dense 2D sub-pixel velocity field between warped suspect and target images, ignoring blank canvas and measuring residual error strictly on textured pixels.',
    whatItIs: 'Dense Inverse Search (DIS) calculates the dense 2D displacement vector field between the aligned suspect and target images, paired with non-linear tone curve fitting.',
    howItWorks: 'The suspect is warped into the 1024px reference frame. We fit a 3×3 color matrix and tone curve to cancel out contrast/saturation filters. DIS then computes pixel-by-pixel flow vectors. We mask out blank/saturated canvas areas and evaluate residuals strictly on textured, informative pixels.',
    whyWeChoseIt: [
      'Orders of magnitude faster than deep neural flow models (RAFT) on CPU.',
      'Exposes generative AI inpainting immediately through localized vector divergence.',
      'Separates true pixel copies from different photos of the same scene.'
    ],
    comparison: [
      { name: 'Farnebäck Flow', pro: 'Classical quadratic polynomial', con: 'Blurry vector boundaries; slow on 1024px frames', ourVerdict: 'Too sluggish for real-time web checks' },
      { name: 'Deep RAFT Flow', pro: 'High accuracy', con: 'Requires 2GB+ VRAM and multi-second GPU time', ourVerdict: 'Incompatible with our CPU-only constraint' },
      { name: 'OpenCV DIS Flow (Our Choice)', pro: 'Near real-time execution on CPU, sub-pixel precision', con: 'Requires prior geometric homography alignment', ourVerdict: 'Perfect fit for our Stage G3 dense analysis' }
    ]
  },
  hash_chain: {
    name: 'Sequential SHA-256 Hash Chain',
    role: 'Cryptographic Registry Integrity',
    category: 'Cryptographic Ledgers',
    equation: 'Block_Hash[i] = SHA-256( Canonical_JSON(Work_Record[i])  +  Block_Hash[i - 1] )',
    plainFormula: 'Each new registration is hashed together with the previous block hash, anchoring the entire registry ledger back to the immutable GENESIS root.',
    whatItIs: 'A sequential, append-only cryptographic ledger where each registered work is permanently linked to the previous registration hash, originating from a known GENESIS block.',
    howItWorks: 'When work i is registered, its canonical representation (ID, creator, title, pHash, raw 512-d CLIP vector, and timestamp) is hashed together with H_{i-1}. This produces a tamper-evident chain: modifying or deleting any historical work invalidates all subsequent block hashes.',
    whyWeChoseIt: [
      'Guarantees internal integrity without relying on external third-party databases.',
      'Lightweight and verifiable offline with a simple shell command (sha256sum).',
      'Provides the canonical Merkle leaf for external blockchain timestamping.'
    ],
    comparison: [
      { name: 'Centralized SQL Database', pro: 'Easy queries', con: 'Any database administrator can backdate or alter records', ourVerdict: 'Fails basic legal evidentiary standards' },
      { name: 'Full Blockchain Nodes', pro: 'Decentralized', con: 'Huge overhead, complex node maintenance', ourVerdict: 'Unnecessary bloat for a registry' },
      { name: 'Linear Hash Chain (Our Choice)', pro: 'Cryptographically immutable, verifiable in seconds', con: 'Requires external anchor for real-world time', ourVerdict: 'Anchored to Bitcoin via OpenTimestamps' }
    ]
  },
  opentimestamps: {
    name: 'Bitcoin OpenTimestamps (.ots)',
    role: 'Decentralized Legal Time-Attestation',
    category: 'Blockchain Provenance',
    equation: 'Bitcoin_Merkle_Root = Hash( Hash( ... Hash(Block_Hash[i]) ... ) )  ∈  Bitcoin Block Header OP_RETURN',
    plainFormula: 'Combines registration hashes into an off-chain Merkle tree and commits the Merkle root directly into the Bitcoin blockchain proof-of-work block header.',
    whatItIs: 'An open protocol that creates cryptographically verifiable proofs that digital data existed prior to a specific point in time by anchoring Merkle tree roots into the Bitcoin blockchain.',
    howItWorks: 'The registry hash is submitted to OpenTimestamps aggregation calendars. Calendar servers combine millions of hashes into a single Merkle tree and embed the root hash into a standard Bitcoin transaction transaction OP_RETURN output. The resulting .ots file contains the Merkle path from the user hash to the Bitcoin block header.',
    whyWeChoseIt: [
      'Zero transaction fees for users (aggregated off-chain).',
      'Backed by the world’s most secure proof-of-work blockchain (Bitcoin).',
      'Independently verifiable offline using standard open-source tools (ots verify).'
    ],
    comparison: [
      { name: 'Ethereum Smart Contract', pro: 'Programmable', con: 'High gas fees ($5–$30 per registration) and network volatility', ourVerdict: 'Cost-prohibitive for creators' },
      { name: 'RFC 3161 Centralized TSA', pro: 'Fast standard', con: 'Relies on centralized corporate trust (e.g. DigiCert)', ourVerdict: 'Can be revoked or subpoenaed' },
      { name: 'OpenTimestamps (Our Choice)', pro: 'Free, trustless, permanent, anchored in Bitcoin', con: 'Takes a few hours for block confirmation', ourVerdict: 'The gold standard for legal digital provenance' }
    ]
  },
  c2pa: {
    name: 'C2PA & Content Credentials',
    role: 'Hardware Provenance & Digital Source Authenticity',
    category: 'Metadata Security',
    equation: 'Digital_Signature_Valid = Verify_PKI( JUMBF_Manifest_Store, X.509_Certificate_Authority )',
    plainFormula: 'Cryptographically verifies digital certificates embedded in hardware cameras (Sony, Leica, Nikon) and authoring software (Adobe, OpenAI, Google) to verify capture origin.',
    whatItIs: 'The open standard (Coalition for Content Provenance and Authenticity) supported by Adobe, Sony, Leica, Nikon, Microsoft, and Google for binding tamper-evident cryptographic metadata directly to media files.',
    howItWorks: 'Compatible cameras and editors sign a cryptographic JUMBF manifest containing creation history, camera serial, and edits using private hardware keys. Our G0 origin parser reads and validates these manifests and scans IPTC DigitalSourceType tags to detect whether an image was camera-captured or AI-generated.',
    whyWeChoseIt: [
      'Separates true camera captures from generative AI at the file-header level.',
      'Unlike easily faked EXIF text, C2PA manifests are cryptographically signed with X.509 PKI certificates.',
      'Honest security posture: we report "no provenance metadata found" rather than guessing.'
    ],
    comparison: [
      { name: 'Standard EXIF / XMP Tags', pro: 'Universally present', con: 'Trivially edited with standard tools; zero security', ourVerdict: 'Treated strictly as informational notes' },
      { name: 'Invisible Watermarking', pro: 'Survives stripping', con: 'Alters pixels, can be scrubbed by diffusion denoisers', ourVerdict: 'Not robust as legal proof' },
      { name: 'C2PA Content Credentials (Our Choice)', pro: 'Cryptographically unforgeable hardware-signed origin', con: 'Often stripped by social platforms like Twitter/WhatsApp', ourVerdict: 'Checked first before falling back to our geometric gate' }
    ]
  },
  pil: {
    name: 'Pillow (PIL) Security & Ingestion',
    role: 'Secure Image Decoding & Normalization',
    category: 'System Ingestion',
    equation: 'Normalized_Frame = EXIF_Orientation_Transpose( Raw_Upload )  ->  sRGB_Canvas',
    plainFormula: 'Evaluates EXIF orientation tag 274 to rotate raw sensor bytes into display orientation, converts color to standard sRGB, and enforces an 89M pixel zip-bomb safety cap.',
    whatItIs: 'The core Python imaging library configured with security safeguards against malicious or malformed user uploads.',
    howItWorks: 'Enforces an 89M pixel decompression-bomb guard, handles multi-channel conversions (RGBA -> RGB with white matte), and automatically evaluates EXIF tag 274 (Orientation) to ensure that the image processed matches exactly what the creator views on screen.',
    whyWeChoseIt: [
      'Robust native C-extensions for secure image decoding.',
      'Standardized color handling prevents JPEG gamma drift.',
      'Strips dangerous embedded metadata before internal pipeline processing.'
    ],
    comparison: [
      { name: 'Raw cv2.imread', pro: 'Fast BGR load', con: 'Ignores EXIF orientation tags and lacks decompression-bomb guards', ourVerdict: 'Caused orientation bugs in early tests' },
      { name: 'Pillow + exif_transpose (Our Choice)', pro: 'Standardized orientation, bomb-proof, sRGB consistency', con: 'Requires explicit color conversion for OpenCV', ourVerdict: 'Foundational G0 ingestion standard' }
    ]
  },
  evidence: {
    name: 'Forensic Evidence Engine',
    role: 'Visual Derivation & Takedown Artifacts',
    category: 'Forensic Reporting',
    equation: 'Pixel_Difference(x, y) = | Image_Original(x, y) - Warped_Suspect(x, y) |',
    plainFormula: 'Per-pixel difference mapping projected onto aligned 1024px reference coordinates, producing side-by-side overlays, inlier tie-lines, and thermal intensity heatmaps for DMCA claims.',
    whatItIs: 'Generates inspectable, visual evidence artifacts that enable creators to file successful copyright takedowns without requiring legal teams to understand computer vision math.',
    howItWorks: 'Generates three synchronized forensic views: 1) Interactive Aligned Overlay, 2) Blue-to-Red Intensity Heatmap showing pixel deviation, and 3) Binary Changed-Region Mask highlighting localized inpainting.',
    whyWeChoseIt: [
      'Moves beyond black-box confidence scores to transparent, verifiable proof.',
      'Exports ready-to-use visual documentation for platform DMCA forms.',
      'Honest grading: clearly distinguishes conclusive proof from investigative leads.'
    ],
    comparison: [
      { name: 'Single Similarity Percentage', pro: 'Simple number', con: 'Unexplainable; platforms reject takedowns without proof', ourVerdict: 'Insufficient for legal enforcement' },
      { name: 'Forensic Evidence Suite (Our Choice)', pro: 'Aligned overlays, pixel heatmaps, and inlier tie-lines', con: 'Requires computing dense residual maps', ourVerdict: 'The centerpiece of our platform' }
    ]
  }
};
