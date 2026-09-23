/**
 * VeriFrame Mock Data Store
 * Isolated mock dataset for frontend development before FastAPI integration.
 * Toggleable via `USE_MOCK` in services/api.js.
 */

export const mockCurrentUser = {
  id: 'usr_vf_9942a',
  name: 'Alex Vance',
  email: 'alex.vance@studioaurora.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  title: 'Lead Visual Designer & Crypto-Photographer',
  bio: 'Specializing in generative synthetic aesthetics, high-speed macro optics, and digital authenticity research.',
  organization: 'Aurora Creative Labs',
  joinedDate: '2025-11-14',
  role: 'Verified Creator',
  stats: {
    registeredAssets: 14,
    verificationChecks: 128,
    potentialMatches: 3,
    certificatesIssued: 14,
    storageUsedMb: 184.6,
    storageLimitMb: 1024
  },
  preferences: {
    notificationsEnabled: true,
    emailAlertsOnMatch: true,
    autoApproveEditorial: false,
    theme: 'dark'
  }
};

export const mockAssets = [
  {
    id: 'ast_vf_882190',
    title: 'Cybernetic Monolith in Neon Fog',
    description: 'Original high-concept digital composition exploring future megastructure decay, rendered in 8K HDR color space.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_vf_9942a',
    ownerName: 'Alex Vance',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-08-14T09:32:11Z',
    fileSize: '14.2 MB',
    dimensions: '7680 x 4320',
    format: 'PNG (Lossless 16-bit)',
    license: 'CC-BY-NC-ND-4.0',
    visibility: 'Public Registry',
    category: 'Digital 3D & Generative',
    tags: ['Cyberpunk', 'Atmosphere', 'Monolith', 'HDR', 'Octane'],
    certificateId: 'VF-CERT-2026-0814-8821',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: true,
    matchCount: 2,
    fingerprints: {
      pHash: '0x8f3c9e1a4b7d2f0e',
      aHash: '0xff818181818181ff',
      dHash: '0x7c38383838383838',
      WHash: '0xe0f8fc7e3e000000',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      clipEmbedding: '512-dim [0.042, -0.018, 0.129, -0.088, 0.201, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [0.081, 0.003, -0.054, 0.119, ...]',
      perceptualQualityScore: 98.4
    }
  },
  {
    id: 'ast_vf_773104',
    title: 'Ethereal Solar Corona over Obsidian Peaks',
    description: 'High altitude astrophysical long-exposure capture composite with optical wave dispersion correction.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_vf_9942a',
    ownerName: 'Alex Vance',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-07-28T14:18:45Z',
    fileSize: '22.8 MB',
    dimensions: '8192 x 5464',
    format: 'TIFF (ProPhoto RGB)',
    license: 'All Rights Reserved (Commercial)',
    visibility: 'Public Registry',
    category: 'Astrophotography',
    tags: ['Solar', 'Astrophotography', 'Mountains', 'Landscape', 'Long Exposure'],
    certificateId: 'VF-CERT-2026-0728-7731',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x9a4f2b8c1d7e3a5f',
      aHash: '0x00ffff0000ffff00',
      dHash: '0x1a2b3c4d5e6f7081',
      WHash: '0x3c3c3c3c3c3c3c3c',
      sha256: '9f83c68a4d2b91e704e0e5a6f23b7c8d9e1a3b5c7d8e9f0a1b2c3d4e5f6a7b8c',
      clipEmbedding: '512-dim [0.115, 0.042, -0.091, 0.174, -0.033, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [-0.012, 0.094, 0.142, -0.061, ...]',
      perceptualQualityScore: 99.1
    }
  },
  {
    id: 'ast_vf_664912',
    title: 'Liquid Chromatic Diffraction No. 4',
    description: 'Macro fluid dynamics experiment capturing polarized optical refraction through micro-prisms.',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
    creator: 'Elena Rostova',
    ownerId: 'usr_vf_3319b',
    ownerName: 'Elena Rostova',
    ownerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-06-19T11:05:00Z',
    fileSize: '18.5 MB',
    dimensions: '6000 x 4000',
    format: 'RAW / DNG',
    license: 'CC-BY-4.0',
    visibility: 'Public Registry',
    category: 'Macro & Experimental',
    tags: ['Diffraction', 'Fluid', 'Abstract', 'Prism', 'Macro'],
    certificateId: 'VF-CERT-2026-0619-6649',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: true,
    matchCount: 1,
    fingerprints: {
      pHash: '0xb2e4c8a1f7d9302e',
      aHash: '0x81818181ffff8181',
      dHash: '0xf0e1d2c3b4a59687',
      WHash: '0x7e7e7e7e7e7e7e7e',
      sha256: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
      clipEmbedding: '512-dim [0.089, -0.142, 0.057, 0.210, -0.019, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [0.103, -0.045, 0.078, 0.155, ...]',
      perceptualQualityScore: 97.8
    }
  },
  {
    id: 'ast_vf_553201',
    title: 'Architectural Tessellation in Brutalist Concrete',
    description: 'Precision architectural study highlighting mathematical rhythm and shadows in post-modern structural facades.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    creator: 'Marcus Sterling',
    ownerId: 'usr_vf_5521c',
    ownerName: 'Marcus Sterling',
    ownerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-05-30T16:42:19Z',
    fileSize: '9.4 MB',
    dimensions: '5120 x 3840',
    format: 'JPEG (99% Quality)',
    license: 'Editorial Only',
    visibility: 'Public Registry',
    category: 'Architecture & Geometry',
    tags: ['Brutalism', 'Concrete', 'Geometry', 'Shadows', 'Minimalism'],
    certificateId: 'VF-CERT-2026-0530-5532',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x1f3e5d7c9b0a2f4e',
      aHash: '0x0f0f0f0f0f0f0f0f',
      dHash: '0x8877665544332211',
      WHash: '0x003f7ffe7e3c0000',
      sha256: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      clipEmbedding: '512-dim [-0.034, 0.188, 0.092, -0.071, 0.126, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [0.067, 0.112, -0.098, 0.044, ...]',
      perceptualQualityScore: 96.5
    }
  },
  {
    id: 'ast_vf_441890',
    title: 'Synthetic Neural Forest Simulation v3',
    description: 'Biomimetic algorithmically grown procedural arboretum with simulated dynamic biophotonic luminescence.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_vf_9942a',
    ownerName: 'Alex Vance',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-04-12T08:14:02Z',
    fileSize: '31.2 MB',
    dimensions: '8000 x 6000',
    format: 'EXR (32-bit Float)',
    license: 'CC-BY-NC-4.0',
    visibility: 'Public Registry',
    category: 'Generative AI & Algorithmic',
    tags: ['Synthetic', 'Neural', 'BioLuminescence', 'Procedural', 'Houdini'],
    certificateId: 'VF-CERT-2026-0412-4418',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: true,
    matchCount: 1,
    fingerprints: {
      pHash: '0x4d8a1f2e7c3b905f',
      aHash: '0xff00ff00ff00ff00',
      dHash: '0x123456789abcdef0',
      WHash: '0x5555555555555555',
      sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      clipEmbedding: '512-dim [0.141, -0.065, 0.083, 0.192, 0.015, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [0.091, -0.023, 0.165, -0.084, ...]',
      perceptualQualityScore: 99.4
    }
  },
  {
    id: 'ast_vf_330782',
    title: 'Quantum Vacuum Fluctuations Simulation',
    description: 'Scientific mathematical visualization of zero-point Casimir energy fields in simulated subatomic lattice.',
    imageUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=400&q=80',
    creator: 'Dr. Sorin Thorne',
    ownerId: 'usr_vf_8812e',
    ownerName: 'Dr. Sorin Thorne',
    ownerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    registeredAt: '2026-03-01T20:10:40Z',
    fileSize: '16.0 MB',
    dimensions: '6400 x 4800',
    format: 'PNG',
    license: 'Academic Non-Commercial',
    visibility: 'Public Registry',
    category: 'Scientific Visualization',
    tags: ['Quantum', 'Physics', 'Simulation', 'Lattice', 'Research'],
    certificateId: 'VF-CERT-2026-0301-3307',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x7e2d9a4b1f8c3e5a',
      aHash: '0xaaaaaaaaaaaaaaaa',
      dHash: '0x0123456789abcdef',
      WHash: '0xaaaaaaaa55555555',
      sha256: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      clipEmbedding: '512-dim [0.032, 0.177, -0.048, 0.104, 0.156, ...]',
      dinov2Embedding: '768-dim ViT-L/14 [-0.045, 0.088, 0.134, -0.012, ...]',
      perceptualQualityScore: 98.0
    }
  }
];

export const mockVerificationResults = [
  {
    id: 'vrf_res_99014',
    suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
    suspiciousFilename: 'suspicious_banner_cropped_v2.webp',
    submittedAt: '2026-09-23T11:45:00Z',
    searchDurationMs: 418,
    recordsIndexed: 142085,
    highestConfidence: 94.2,
    matchesFoundCount: 2,
    topMatchStatus: 'High Similarity',
    matches: [
      {
        matchRank: 1,
        assetId: 'ast_vf_882190',
        title: 'Cybernetic Monolith in Neon Fog',
        creator: 'Alex Vance',
        ownerName: 'Alex Vance',
        registeredAt: '2026-08-14T09:32:11Z',
        originalImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
        certificateId: 'VF-CERT-2026-0814-8821',
        similarityMetrics: {
          hammingDistance: 3, // Range 0-64; 3 is extremely close
          maxHammingDistance: 64,
          perceptualSimilarityScore: 95.3,
          pHashMatch: 96.8,
          aHashMatch: 98.4,
          dHashMatch: 93.7,
          wHashMatch: 92.5,
          clipCosineSimilarity: 0.941,
          dinov2CosineSimilarity: 0.963,
          semanticSimilarityScore: 95.2,
          combinedWeightedConfidence: 94.2
        },
        similarityTier: 'High Similarity',
        confidenceBadge: 'High Match Alert',
        manipulationFlags: [
          'Spatial crop detected (~14% margins removed)',
          'Lossy recompression artifacts (WebP Q60)',
          'Subtle contrast & gamma curve boost (+8%)'
        ],
        evidenceId: 'evi_vf_882190_01'
      },
      {
        matchRank: 2,
        assetId: 'ast_vf_441890',
        title: 'Synthetic Neural Forest Simulation v3',
        creator: 'Alex Vance',
        ownerName: 'Alex Vance',
        registeredAt: '2026-04-12T08:14:02Z',
        originalImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
        certificateId: 'VF-CERT-2026-0412-4418',
        similarityMetrics: {
          hammingDistance: 22,
          maxHammingDistance: 64,
          perceptualSimilarityScore: 65.6,
          pHashMatch: 64.0,
          aHashMatch: 70.2,
          dHashMatch: 62.5,
          wHashMatch: 65.8,
          clipCosineSimilarity: 0.612,
          dinov2CosineSimilarity: 0.589,
          semanticSimilarityScore: 60.1,
          combinedWeightedConfidence: 62.8
        },
        similarityTier: 'Moderate Similarity',
        confidenceBadge: 'Semantic Proximity Only',
        manipulationFlags: [
          'Color palette intersection detected',
          'Dissimilar edge distribution'
        ],
        evidenceId: 'evi_vf_441890_02'
      }
    ]
  }
];

export const mockEvidenceRecords = {
  'evi_vf_882190_01': {
    id: 'evi_vf_882190_01',
    assetId: 'ast_vf_882190',
    title: 'Cybernetic Monolith in Neon Fog',
    registeredOwner: 'Alex Vance',
    ownerEmail: 'alex.vance@studioaurora.ai',
    originalRegisteredAt: '2026-08-14T09:32:11 UTC',
    certificateId: 'VF-CERT-2026-0814-8821',
    originalImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
    suspiciousSource: 'External Web Crawler / Upload Verification',
    analyzedAt: '2026-09-23T11:45:00 UTC',
    
    // Perceptual Breakdown
    perceptual: {
      overallScore: 95.3,
      hammingDistance: 3,
      maxHammingDistance: 64,
      hashes: {
        pHash: { original: '0x8f3c9e1a4b7d2f0e', suspicious: '0x8f3c9e1a4b7d2f0a', bitDifference: 1, matchRate: 98.4 },
        aHash: { original: '0xff818181818181ff', suspicious: '0xff818181818181ff', bitDifference: 0, matchRate: 100.0 },
        dHash: { original: '0x7c38383838383838', suspicious: '0x7c3838383838383c', bitDifference: 2, matchRate: 96.8 },
        WHash: { original: '0xe0f8fc7e3e000000', suspicious: '0xe0f8fc7e3e000002', bitDifference: 1, matchRate: 98.4 }
      }
    },

    // Semantic Breakdown
    semantic: {
      overallScore: 95.2,
      clipCosineSimilarity: 0.9412,
      dinov2CosineSimilarity: 0.9631,
      embeddingModelClip: 'ViT-B/32 (512-dim Normalized)',
      embeddingModelDinov2: 'ViT-L/14 Registers (768-dim)',
      featureCoherence: 96.8
    },

    // Fusion Confidence
    fusion: {
      combinedConfidence: 94.2,
      confidenceClassification: 'High Similarity',
      algorithmicWeights: {
        perceptualWeight: 0.50,
        semanticWeight: 0.50
      },
      formulaExplanation: 'Score = (0.50 × Perceptual Match) + (0.50 × Semantic Cosine Alignment). Metric indicates structural and thematic equivalence consistent with crop and re-encoding derivative.'
    },

    // Detected Alterations
    alterations: [
      { type: 'Spatial Cropping', severity: 'Medium', details: 'Approx 14% cropped from top and right boundaries.' },
      { type: 'Compression Transcoding', severity: 'Low', details: 'Transcoded to WebP format with quantization matrix divergence.' },
      { type: 'Color Space Adjustment', severity: 'Low', details: 'Gamma shifted by +0.08, saturation boosted by 4%.' }
    ],

    legalDisclaimer: 'Algorithmic confidence scores represent cryptographic and mathematical similarity metrics calculated via dual-pipeline fingerprinting. They do not constitute a legal determination of copyright infringement or ownership.'
  }
};

export const mockCertificates = {
  'VF-CERT-2026-0814-8821': {
    certificateId: 'VF-CERT-2026-0814-8821',
    assetId: 'ast_vf_882190',
    title: 'Cybernetic Monolith in Neon Fog',
    creator: 'Alex Vance',
    ownerName: 'Alex Vance',
    ownerId: 'usr_vf_9942a',
    issuer: 'VeriFrame Cryptographic Provenance Protocol v2.4',
    issuedAt: '2026-08-14T09:32:11 UTC',
    status: 'ACTIVE_AUTHENTICATED',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    fileIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    perceptualFingerprints: {
      pHash: '0x8f3c9e1a4b7d2f0e',
      aHash: '0xff818181818181ff',
      dHash: '0x7c38383838383838',
      WHash: '0xe0f8fc7e3e000000'
    },
    semanticVectors: {
      clipModel: 'OpenAI-ViT-B-32-L2',
      dinov2Model: 'Meta-DINOv2-ViT-L-14',
      registryBlockHeight: 184920
    },
    digitalSignature: 'SIG_VF_ED25519_9942_8F3C_E3B0_7C38_4A9B_PROVENANCE_SEALED',
    qrPayload: 'https://veriframe.io/verify/cert/VF-CERT-2026-0814-8821'
  }
};

export const mockNotifications = [
  {
    id: 'ntf_01',
    type: 'match_found',
    title: 'Potential Match Detected',
    message: 'A web crawler detected a high-confidence match (94.2%) for your asset "Cybernetic Monolith in Neon Fog".',
    timestamp: '2026-09-23T11:45:00Z',
    isRead: false,
    assetId: 'ast_vf_882190',
    evidenceId: 'evi_vf_882190_01',
    severity: 'warning'
  },
  {
    id: 'ntf_02',
    type: 'download_request',
    title: 'Download Request Submitted',
    message: 'Dr. Sorin Thorne requested download authorization for "Cybernetic Monolith in Neon Fog".',
    timestamp: '2026-09-22T16:20:00Z',
    isRead: false,
    requestId: 'req_dl_102',
    severity: 'info'
  },
  {
    id: 'ntf_03',
    type: 'certificate_generated',
    title: 'Certificate Sealed',
    message: 'Cryptographic provenance certificate VF-CERT-2026-0728-7731 is ready for "Ethereal Solar Corona over Obsidian Peaks".',
    timestamp: '2026-07-28T14:18:50Z',
    isRead: true,
    certificateId: 'VF-CERT-2026-0728-7731',
    severity: 'success'
  },
  {
    id: 'ntf_04',
    type: 'verification_completed',
    title: 'Forensic Verification Finished',
    message: 'Verification task #VRF-99014 finished in 418ms against 142,085 registry items.',
    timestamp: '2026-09-23T11:45:10Z',
    isRead: true,
    severity: 'info'
  },
  {
    id: 'ntf_05',
    type: 'registration_successful',
    title: 'Work Registered in Public Registry',
    message: 'Asset "Cybernetic Monolith in Neon Fog" has been indexed into dual-pipeline vector store.',
    timestamp: '2026-08-14T09:32:15Z',
    isRead: true,
    severity: 'success'
  }
];

export const mockDownloadRequests = [
  {
    id: 'req_dl_102',
    requesterName: 'Dr. Sorin Thorne',
    requesterEmail: 'sorin.thorne@quantum-optics.org',
    requesterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    assetId: 'ast_vf_882190',
    assetTitle: 'Cybernetic Monolith in Neon Fog',
    assetThumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
    requestedAt: '2026-09-22T16:20:00Z',
    purpose: 'Academic citation and presentation slide in IEEE Computer Graphics Conference 2026 keynote.',
    licenseRequested: 'Academic & Non-Commercial Presentation',
    status: 'Pending'
  },
  {
    id: 'req_dl_101',
    requesterName: 'Horizon Creative Press',
    requesterEmail: 'licensing@horizonpress.media',
    requesterAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    assetId: 'ast_vf_773104',
    assetTitle: 'Ethereal Solar Corona over Obsidian Peaks',
    assetThumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
    requestedAt: '2026-09-18T10:14:00Z',
    purpose: 'Front cover editorial illustration for monthly science & tech journal issue #144.',
    licenseRequested: 'Commercial Editorial License',
    status: 'Approved'
  }
];
