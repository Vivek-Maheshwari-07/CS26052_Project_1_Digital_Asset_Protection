/**
 * Asset Management Service
 * Communicates with FastAPI backend for asset indexing, registry queries, and public gallery.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockAssets } from '../data/mockData';

export const assetService = {
  async getAssets(filter = {}) {
    if (USE_MOCK) {
      await mockDelay(350);
      let list = [...mockAssets];
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(a => a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
      }
      if (filter.category && filter.category !== 'All') {
        list = list.filter(a => a.category === filter.category);
      }
      return list;
    }
    // Remote endpoint: GET /api/assets
  },

  async getAssetById(id) {
    if (USE_MOCK) {
      await mockDelay(300);
      const asset = mockAssets.find(a => a.id === id);
      if (!asset) {
        // Fallback to first if testing dynamic IDs
        return mockAssets[0];
      }
      return asset;
    }
    // Remote endpoint: GET /api/assets/:id
  },

  async registerAsset(payload, onProgress) {
    if (USE_MOCK) {
      // Step 1: Uploading file
      if (onProgress) onProgress(1, 'Uploading high-resolution image file...');
      await mockDelay(700);

      // Step 2: Extracting perceptual fingerprints
      if (onProgress) onProgress(2, 'Extracting perceptual hashes (pHash, aHash, dHash, WHash)...');
      await mockDelay(800);

      // Step 3: Generating semantic embeddings
      if (onProgress) onProgress(3, 'Generating deep semantic embeddings (CLIP ViT-B/32, DINOv2 ViT-L/14)...');
      await mockDelay(900);

      // Step 4: Checking registry uniqueness
      if (onProgress) onProgress(4, 'Querying registry vector index (pgvector) for duplicate collision...');
      await mockDelay(600);

      // Step 5: Saving provenance record
      if (onProgress) onProgress(5, 'Sealing cryptographic provenance record and timestamp...');
      await mockDelay(600);

      // Step 6: Generating certificate
      if (onProgress) onProgress(6, 'Minting VeriFrame Provenance Certificate...');
      await mockDelay(500);

      const newId = `ast_vf_${Math.random().toString(36).substr(2, 6)}`;
      const certId = `VF-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newAsset = {
        id: newId,
        title: payload.title || 'Untitled Registered Work',
        description: payload.description || '',
        imageUrl: payload.previewUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: payload.previewUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        creator: payload.creator || 'Alex Vance',
        ownerId: 'usr_vf_9942a',
        ownerName: payload.creator || 'Alex Vance',
        ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        registeredAt: new Date().toISOString(),
        fileSize: payload.fileSize || '12.4 MB',
        dimensions: payload.dimensions || '6000 x 4000',
        format: payload.format || 'PNG',
        license: payload.license || 'CC-BY-4.0',
        visibility: payload.visibility || 'Public Registry',
        category: payload.category || 'Digital 3D & Generative',
        tags: payload.tags || ['Digital Art', 'Registered'],
        certificateId: certId,
        verificationStatus: 'Verified Original',
        hasPotentialMatches: false,
        matchCount: 0,
        fingerprints: {
          pHash: '0x' + Math.random().toString(16).substr(2, 16),
          aHash: '0x' + Math.random().toString(16).substr(2, 16),
          dHash: '0x' + Math.random().toString(16).substr(2, 16),
          WHash: '0x' + Math.random().toString(16).substr(2, 16),
          sha256: 'sha256_' + Math.random().toString(36).substr(2, 18),
          clipEmbedding: '512-dim [0.042, -0.018, 0.129, ...]',
          dinov2Embedding: '768-dim ViT-L/14 [0.081, 0.003, ...]',
          perceptualQualityScore: 99.2
        }
      };

      // Add to front of mock list for session
      mockAssets.unshift(newAsset);
      return newAsset;
    }
    // Remote endpoint: POST /api/assets/register
  },

  async getPublicGallery(params = {}) {
    if (USE_MOCK) {
      await mockDelay(300);
      let list = [...mockAssets];
      if (params.category && params.category !== 'All') {
        list = list.filter(a => a.category.toLowerCase() === params.category.toLowerCase());
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(a => a.title.toLowerCase().includes(q) || a.creator.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
      }
      if (params.sort === 'oldest') {
        list.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
      } else {
        list.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
      }
      return list;
    }
    // Remote endpoint: GET /api/gallery
  }
};

export default assetService;
