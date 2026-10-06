/**
 * VeriFrame Mock Data Store
 * Isolated sample dataset for frontend development before FastAPI integration.
 */

export const mockCurrentUser = {
  id: 'usr_88421',
  name: 'Alex Vance',
  email: 'alex.vance@studioaurora.com',
  title: 'Digital Artist & Photographer',
  bio: 'Specializing in digital photography, 3D compositions, and image protection.',
  organization: 'Aurora Studio',
  joinedDate: '2025-11-14',
  role: 'Creator',
  stats: {
    registeredAssets: 14,
    verificationChecks: 128,
    potentialMatches: 2,
    certificatesIssued: 14,
    storageUsedMb: 184.6,
    storageLimitMb: 1024
  },
  preferences: {
    theme: 'dark'
  }
};

export const mockAssets = [
  {
    id: 'ast_882190',
    title: 'Cyberpunk City in Neon Fog',
    description: 'Digital 3D illustration exploring futuristic cityscape lighting and fog effects.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_88421',
    ownerName: 'Alex Vance',
    registeredAt: '2026-08-14T09:32:11Z',
    fileSize: '14.2 MB',
    dimensions: '7680 x 4320',
    format: 'PNG',
    license: 'CC-BY-NC-4.0',
    visibility: 'Public',
    category: 'Digital 3D Art',
    tags: ['Cyberpunk', 'Cityscape', 'Neon', '3D Render'],
    certificateId: 'VF-CERT-2026-8821',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: true,
    matchCount: 1,
    fingerprints: {
      pHash: '0x8f3c9e1a4b7d2f0e',
      aHash: '0xff818181818181ff',
      dHash: '0x7c38383838383838',
      WHash: '0xe0f8fc7e3e000000',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      clipEmbedding: '512-dim normalized vector',
      dinov2Embedding: '768-dim ViT-L/14 vector'
    }
  },
  {
    id: 'ast_773104',
    title: 'Sunrise over Mountain Range',
    description: 'Landscape photography taken during sunrise over snow-capped mountain peaks.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_88421',
    ownerName: 'Alex Vance',
    registeredAt: '2026-07-28T14:18:45Z',
    fileSize: '22.8 MB',
    dimensions: '8192 x 5464',
    format: 'TIFF',
    license: 'All Rights Reserved',
    visibility: 'Public',
    category: 'Photography',
    tags: ['Mountains', 'Sunrise', 'Landscape', 'Nature'],
    certificateId: 'VF-CERT-2026-7731',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x9a4f2b8c1d7e3a5f',
      aHash: '0x00ffff0000ffff00',
      dHash: '0x1a2b3c4d5e6f7081',
      WHash: '0x3c3c3c3c3c3c3c3c',
      sha256: '9f83c68a4d2b91e704e0e5a6f23b7c8d9e1a3b5c7d8e9f0a1b2c3d4e5f6a7b8c',
      clipEmbedding: '512-dim normalized vector',
      dinov2Embedding: '768-dim ViT-L/14 vector'
    }
  },
  {
    id: 'ast_664912',
    title: 'Abstract Fluid Colors',
    description: 'Macro studio photography exploring liquid paint mixing and refractive lighting.',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
    creator: 'Elena Rostova',
    ownerId: 'usr_3319b',
    ownerName: 'Elena Rostova',
    registeredAt: '2026-06-19T11:05:00Z',
    fileSize: '18.5 MB',
    dimensions: '6000 x 4000',
    format: 'PNG',
    license: 'CC-BY-4.0',
    visibility: 'Public',
    category: 'Abstract & Macro',
    tags: ['Abstract', 'Fluid', 'Colors', 'Macro'],
    certificateId: 'VF-CERT-2026-6649',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0xb2e4c8a1f7d9302e',
      aHash: '0x81818181ffff8181',
      dHash: '0xf0e1d2c3b4a59687',
      WHash: '0x7e7e7e7e7e7e7e7e',
      sha256: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
      clipEmbedding: '512-dim normalized vector',
      dinov2Embedding: '768-dim ViT-L/14 vector'
    }
  },
  {
    id: 'ast_553201',
    title: 'Modern Architecture Facade',
    description: 'Geometric architectural photograph showcasing light and shadow patterns on concrete.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    creator: 'Marcus Sterling',
    ownerId: 'usr_5521c',
    ownerName: 'Marcus Sterling',
    registeredAt: '2026-05-30T16:42:19Z',
    fileSize: '9.4 MB',
    dimensions: '5120 x 3840',
    format: 'JPEG',
    license: 'Editorial',
    visibility: 'Public',
    category: 'Architecture',
    tags: ['Architecture', 'Minimalism', 'Geometry', 'Building'],
    certificateId: 'VF-CERT-2026-5532',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x1f3e5d7c9b0a2f4e',
      aHash: '0x0f0f0f0f0f0f0f0f',
      dHash: '0x8877665544332211',
      WHash: '0x003f7ffe7e3c0000',
      sha256: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      clipEmbedding: '512-dim normalized vector',
      dinov2Embedding: '768-dim ViT-L/14 vector'
    }
  },
  {
    id: 'ast_441890',
    title: 'Digital Forest Composition',
    description: 'Digital artwork with glowing ambient light and lush vegetation textures.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    creator: 'Alex Vance',
    ownerId: 'usr_88421',
    ownerName: 'Alex Vance',
    registeredAt: '2026-04-12T08:14:02Z',
    fileSize: '31.2 MB',
    dimensions: '8000 x 6000',
    format: 'PNG',
    license: 'CC-BY-NC-4.0',
    visibility: 'Public',
    category: 'Digital 3D Art',
    tags: ['Digital Art', 'Forest', 'Nature', 'Light'],
    certificateId: 'VF-CERT-2026-4418',
    verificationStatus: 'Verified Original',
    hasPotentialMatches: false,
    matchCount: 0,
    fingerprints: {
      pHash: '0x4d8a1f2e7c3b905f',
      aHash: '0xff00ff00ff00ff00',
      dHash: '0x123456789abcdef0',
      WHash: '0x5555555555555555',
      sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      clipEmbedding: '512-dim normalized vector',
      dinov2Embedding: '768-dim ViT-L/14 vector'
    }
  }
];

export const mockVerificationResults = [
  {
    id: 'vrf_99014',
    suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
    suspiciousFilename: 'query_image_cropped.webp',
    submittedAt: '2026-09-23T11:45:00Z',
    searchDurationMs: 380,
    recordsIndexed: 142085,
    highestConfidence: 94.2,
    matchesFoundCount: 2,
    topMatchStatus: 'High Similarity',
    matches: [
      {
        matchRank: 1,
        assetId: 'ast_882190',
        title: 'Cyberpunk City in Neon Fog',
        creator: 'Alex Vance',
        ownerName: 'Alex Vance',
        registeredAt: '2026-08-14T09:32:11Z',
        originalImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
        certificateId: 'VF-CERT-2026-8821',
        similarityMetrics: {
          hammingDistance: 3,
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
        confidenceBadge: 'High Match',
        manipulationFlags: [
          'Cropped edges (~14% removed)',
          'Compressed image format (WebP)',
          'Slight contrast increase'
        ]
      },
      {
        matchRank: 2,
        assetId: 'ast_441890',
        title: 'Digital Forest Composition',
        creator: 'Alex Vance',
        ownerName: 'Alex Vance',
        registeredAt: '2026-04-12T08:14:02Z',
        originalImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        suspiciousImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60',
        certificateId: 'VF-CERT-2026-4418',
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
        confidenceBadge: 'Moderate Match',
        manipulationFlags: [
          'Similar color tones',
          'Different edge structure'
        ]
      }
    ]
  }
];

export const mockCertificates = {
  'VF-CERT-2026-8821': {
    certificateId: 'VF-CERT-2026-8821',
    assetId: 'ast_882190',
    title: 'Cyberpunk City in Neon Fog',
    creator: 'Alex Vance',
    ownerName: 'Alex Vance',
    ownerId: 'usr_88421',
    issuer: 'VeriFrame Provenance System',
    issuedAt: '2026-08-14 09:32 UTC',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    fileIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    perceptualFingerprints: {
      pHash: '0x8f3c9e1a4b7d2f0e',
      aHash: '0xff818181818181ff',
      dHash: '0x7c38383838383838',
      WHash: '0xe0f8fc7e3e000000'
    },
    semanticVectors: {
      clipModel: 'CLIP ViT-B/32',
      dinov2Model: 'DINOv2 ViT-L/14'
    },
    digitalSignature: 'SIG_VF_8F3C_E3B0_7C38_4A9B_SEALED'
  },
  'VF-CERT-2026-0814-8821': {
    certificateId: 'VF-CERT-2026-0814-8821',
    assetId: 'ast_882190',
    title: 'Cyberpunk City in Neon Fog',
    creator: 'Alex Vance',
    ownerName: 'Alex Vance',
    ownerId: 'usr_88421',
    issuer: 'VeriFrame Provenance System',
    issuedAt: '2026-08-14 09:32 UTC',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    fileIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    perceptualFingerprints: {
      pHash: '0x8f3c9e1a4b7d2f0e',
      aHash: '0xff818181818181ff',
      dHash: '0x7c38383838383838',
      WHash: '0xe0f8fc7e3e000000'
    },
    semanticVectors: {
      clipModel: 'CLIP ViT-B/32',
      dinov2Model: 'DINOv2 ViT-L/14'
    },
    digitalSignature: 'SIG_VF_8F3C_E3B0_7C38_4A9B_SEALED'
  }
};
