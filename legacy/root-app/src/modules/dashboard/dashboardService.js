import { mockDelay } from '../../services/api';

export const MOCK_IMAGES = [
  {
    id: 'img_001',
    title: 'Cybernetic Sentinel Genesis',
    creatorName: '@elena_rostova',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_002',
    title: 'Neon Horizon Synthesis',
    creatorName: '@marcus_vance',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_003',
    title: 'Quantum Bio-Architecture',
    creatorName: '@sora_tanaka',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_004',
    title: 'Sub-surface Light Distortion',
    creatorName: '@aria_vance',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_005',
    title: 'Prismatic Void Spectrum',
    creatorName: '@david_kael',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_006',
    title: 'Ethereal Nebula Structures',
    creatorName: '@maya_lin',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_007',
    title: 'Abstract Fluid Dynamics',
    creatorName: '@alex_rivera',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'img_008',
    title: 'Monochrome Organic Forms',
    creatorName: '@sam_taylor',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
  }
];

export const dashboardService = {
  async getGalleryImages() {
    await mockDelay(300);
    return MOCK_IMAGES;
  },

  async searchGallery(query) {
    await mockDelay(200);
    if (!query || !query.trim()) return MOCK_IMAGES;
    const term = query.toLowerCase().trim();
    return MOCK_IMAGES.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.creatorName.toLowerCase().includes(term)
    );
  }
};

export default dashboardService;
