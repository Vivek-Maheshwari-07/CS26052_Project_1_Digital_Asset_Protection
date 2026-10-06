import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  Layers
} from 'lucide-react';
import assetService from '../services/assetService';
import GalleryGrid from '../components/gallery/GalleryGrid';
import ImagePreviewModal from '../components/gallery/ImagePreviewModal';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export const Gallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  const [previewAsset, setPreviewAsset] = useState(null);

  const categories = [
    'All',
    'Digital 3D & Generative',
    'Astrophotography',
    'Macro & Experimental',
    'Architecture & Geometry',
    'Scientific Visualization'
  ];

  const fetchGalleryAssets = async () => {
    setIsLoading(true);
    try {
      const data = await assetService.getPublicGallery({
        search: searchQuery,
        category: selectedCategory,
        sort: sortOrder
      });
      setAssets(data || []);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleryAssets();
  }, [selectedCategory, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGalleryAssets();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortOrder('newest');
    setSearchParams({});
    assetService.getPublicGallery({ category: 'All', sort: 'newest' }).then(setAssets);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm" icon={Sparkles}>
              Public Registry Gallery
            </Badge>
            <span className="text-xs text-slate-400 font-mono">
              Immutable Dual-Pipeline Index
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Verified Digital Asset Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Browse original digital photography, procedural 3D, and creative works protected by cryptographic timestamps and perceptual hashes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Public Browsing Enabled • Dual Fingerprints</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, creator, tags, hash, or keywords..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Categories & Sorting */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Grid Display */}
      <GalleryGrid
        assets={assets}
        isLoading={isLoading}
        onSelectAsset={(asset) => setPreviewAsset(asset)}
        onResetFilters={handleResetFilters}
      />

      {/* Full Record Preview Modal */}
      <ImagePreviewModal
        asset={previewAsset}
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  );
};

export default Gallery;
