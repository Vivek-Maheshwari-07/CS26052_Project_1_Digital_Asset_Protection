import React from 'react';
import { ShieldCheck, Eye, Download, Calendar, User } from 'lucide-react';
import Badge from '../ui/Badge';

export const ImageCard = ({ asset, onClick, onRequestDownload }) => {
  return (
    <div
      onClick={() => onClick(asset)}
      className="group relative rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 cursor-pointer flex flex-col"
    >
      {/* Thumbnail with overlay */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={asset.thumbnailUrl || asset.imageUrl}
          alt={asset.title}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220] via-transparent to-black/20 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Verification Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="success" size="xs" icon={ShieldCheck}>
            {asset.verificationStatus || 'Verified Original'}
          </Badge>
        </div>

        {/* Action icons on hover */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(asset);
            }}
            className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-cyan-500 hover:text-black transition-colors"
            title="Inspect Provenance"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDownload(asset);
            }}
            className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-cyan-500 hover:text-black transition-colors"
            title="Request Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom category tag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/30 backdrop-blur-sm truncate">
            {asset.category || 'Digital Asset'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {asset.dimensions}
          </span>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
            {asset.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {asset.description}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={asset.ownerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={asset.creator}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
            />
            <span className="truncate text-slate-300 font-medium">{asset.creator}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 shrink-0">
            {new Date(asset.registeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
