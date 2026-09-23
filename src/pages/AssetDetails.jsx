import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Fingerprint,
  Cpu,
  Layers,
  Calendar,
  User,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Download,
  Lock,
  CheckCircle2,
  FileCheck2,
  Copy,
  GitCompare
} from 'lucide-react';
import assetService from '../services/assetService';
import { mockEvidenceRecords } from '../data/mockData';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../context/ToastContext';

export const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [asset, setAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAssetDetails = async () => {
      setIsLoading(true);
      try {
        const data = await assetService.getAssetById(id);
        setAsset(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssetDetails();
  }, [id]);

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.info('Copied to Clipboard', `${label} copied successfully.`);
    }
  };

  if (isLoading || !asset) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Fetching Provenance Record...</p>
        </div>
      </div>
    );
  }

  const detailTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'fingerprint', label: 'Dual Fingerprints' },
    { id: 'provenance', label: 'Provenance Record' },
    { id: 'matches', label: 'Potential Matches', count: asset.matchCount }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assets</span>
        </button>

        <div className="flex items-center gap-3">
          <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`}>
            <Button variant="glow" size="sm" icon={Award}>
              View Certificate
            </Button>
          </Link>
          <Link to={`/verify`}>
            <Button variant="outline" size="sm" icon={GitCompare}>
              Verify Derivative
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Image on Left, Primary Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Display */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center p-2">
            <img
              src={asset.imageUrl || asset.thumbnailUrl}
              alt={asset.title}
              className="w-full h-full object-contain rounded-2xl"
            />
            <div className="absolute top-4 left-4">
              <Badge variant="success" size="sm" icon={ShieldCheck}>
                {asset.verificationStatus || 'Verified Original'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Resolution</span>
              <span className="font-bold text-slate-200">{asset.dimensions}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Format</span>
              <span className="font-bold text-slate-200">{asset.format}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">File Size</span>
              <span className="font-bold text-slate-200">{asset.fileSize}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Category & Tabbed Details */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              {asset.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 leading-tight">
              {asset.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {asset.description}
            </p>
          </div>

          {/* Tab Switcher */}
          <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab Content 1: Overview */}
          {activeTab === 'overview' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Creator / Owner</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={asset.ownerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={asset.creator}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <span className="font-semibold text-white">{asset.creator}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Registration Date</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {new Date(asset.registeredAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Licensing Terms</span>
                  <span className="text-cyan-300 font-medium">{asset.license}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Registry Visibility</span>
                  <span className="text-slate-200 font-medium">{asset.visibility}</span>
                </div>
              </div>

              {/* Tags */}
              {asset.tags && asset.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-slate-400 block mb-2 font-mono text-[11px]">Indexed Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Dual Fingerprints */}
          {activeTab === 'fingerprint' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs animate-in fade-in duration-200 font-mono">
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  Perceptual Hashes (Frequency Domain)
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">pHash:</span>
                    <span className="text-cyan-400 font-bold">{asset.fingerprints?.pHash}</span>
                    <button
                      onClick={() => copyToClipboard(asset.fingerprints?.pHash, 'pHash')}
                      className="p-1 hover:text-white text-slate-500"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">aHash:</span>
                    <span className="text-slate-300 font-bold">{asset.fingerprints?.aHash}</span>
                    <button
                      onClick={() => copyToClipboard(asset.fingerprints?.aHash, 'aHash')}
                      className="p-1 hover:text-white text-slate-500"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">dHash:</span>
                    <span className="text-slate-300 font-bold">{asset.fingerprints?.dHash}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">WHash:</span>
                    <span className="text-slate-300 font-bold">{asset.fingerprints?.WHash}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] uppercase font-bold text-indigo-400 block">
                  Deep Semantic Vectors (FastAPI Inference)
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>CLIP Signature:</span>
                    <span className="text-indigo-300 font-mono">512-dim L2-normalized</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DINOv2 Signature:</span>
                    <span className="text-emerald-300 font-mono">768-dim ViT-L/14</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Provenance */}
          {activeTab === 'provenance' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500">Certificate ID</span>
                  <p className="font-mono font-bold text-white text-sm">{asset.certificateId}</p>
                </div>
                <Link to={`/certificate/${asset.certificateId}`}>
                  <Button variant="outline" size="xs" icon={ExternalLink}>
                    View
                  </Button>
                </Link>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                <span className="text-slate-500 block text-[10px]">SHA-256 File Integrity Digest</span>
                <p className="text-slate-300 break-all">{asset.fingerprints?.sha256}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Original registration timestamp signed with Ed25519 cryptographic key.</span>
              </div>
            </div>
          )}

          {/* Tab Content 4: Matches */}
          {activeTab === 'matches' && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs animate-in fade-in duration-200">
              {asset.hasPotentialMatches ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      High-similarity derivative detected across external crawling queries (94.2% match).
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Match Alert #MAT-882190</span>
                      <Badge variant="warning" size="xs">
                        94.2% Similarity
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Derivative detected with spatial cropping (~14% margins removed) and WebP quantization artifacts.
                    </p>
                    <div className="pt-2 flex justify-end">
                      <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`}>
                        <Button variant="outline" size="xs" icon={Award}>
                          Verify Provenance Certificate
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-white">No Disputed Matches Detected</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    The pgvector scanner has not flagged any unauthorized derivatives in current index rounds.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
