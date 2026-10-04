import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderLock,
  Plus,
  Search,
  Grid,
  List,
  Filter,
  ShieldCheck,
  Award,
  AlertTriangle
} from 'lucide-react';
import assetService from '../services/assetService';
import AssetCard from '../components/assets/AssetCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';

export const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    'Digital 3D & Generative',
    'Astrophotography',
    'Macro & Experimental',
    'Architecture & Geometry',
    'Scientific Visualization'
  ];

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const list = await assetService.getAssets({
          search: searchQuery,
          category: selectedCategory
        });
        setAssets(list || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm" icon={FolderLock}>
              Creator Repository
            </Badge>
            <span className="text-xs text-slate-400 font-mono">{assets.length} Total Assets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Registered Assets
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your cryptographic image provenance records, inspect hashes, and view potential-match flags.
          </p>
        </div>

        <Link to="/register">
          <Button variant="primary" size="md" icon={Plus}>
            Register New Asset
          </Button>
        </Link>
      </div>

      {/* Toolbar: Search, Filters, View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my registered assets by title, tag, or hash..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Grid / List Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4">
          <FolderLock className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Assets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No registered works match your criteria. Click below to register your first artwork.
          </p>
          <Link to="/register">
            <Button variant="primary" size="sm" icon={Plus}>
              Register New Work
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Assets;
