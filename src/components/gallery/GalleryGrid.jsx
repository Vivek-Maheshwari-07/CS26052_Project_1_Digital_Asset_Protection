import React from 'react';
import ImageCard from './ImageCard';
import { CardSkeleton } from '../ui/Skeleton';
import { Sparkles, SearchX } from 'lucide-react';
import Button from '../ui/Button';

export const GalleryGrid = ({
  assets = [],
  isLoading = false,
  onSelectAsset,
  onResetFilters
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center max-w-lg mx-auto my-8">
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-4 text-cyan-400">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Matching Assets Found</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          No registered works match your active search terms or category filter. Try clearing filters or searching for different keywords.
        </p>
        {onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Clear All Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
      {assets.map((asset) => (
        <ImageCard
          key={asset.id}
          asset={asset}
          onClick={onSelectAsset}
        />
      ))}
    </div>
  );
};

export default GalleryGrid;
