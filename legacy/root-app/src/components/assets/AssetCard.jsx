import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Eye,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export const AssetCard = ({ asset, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
          <img
            src={asset.thumbnailUrl || asset.imageUrl}
            alt={asset.title}
            className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{asset.title}</h4>
              <Badge variant="success" size="xs">
                {asset.verificationStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{asset.category} • {asset.dimensions} • {asset.license}</p>
            <p className="text-[11px] font-mono text-cyan-400 mt-1">pHash: {asset.fingerprints?.pHash}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link to={`/assets/${asset.id}`}>
            <Button variant="outline" size="xs" icon={Eye}>
              Inspect
            </Button>
          </Link>
          <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`}>
            <Button variant="secondary" size="xs" icon={Award}>
              Certificate
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col shadow-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={asset.thumbnailUrl || asset.imageUrl}
          alt={asset.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="success" size="xs" icon={ShieldCheck}>
            Verified Original
          </Badge>
          {asset.hasPotentialMatches && (
            <Badge variant="warning" size="xs" icon={AlertTriangle}>
              {asset.matchCount} Alert
            </Badge>
          )}
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span>{asset.dimensions}</span>
          <span className="text-cyan-400 font-semibold">{asset.category}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
            {asset.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {asset.description}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[10px] flex justify-between text-slate-400">
          <span>pHash:</span>
          <span className="text-cyan-300 font-bold">{asset.fingerprints?.pHash}</span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
          <Link to={`/assets/${asset.id}`} className="flex-1">
            <Button variant="outline" size="xs" className="w-full" icon={Eye}>
              Inspect
            </Button>
          </Link>
          <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`} className="flex-1">
            <Button variant="secondary" size="xs" className="w-full" icon={Award}>
              Certificate
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;
