import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Download,
  Eye,
  ArrowRight,
  Fingerprint,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { mockAssets } from '../data/mockData';

export const RegistrationResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const asset = location.state?.registeredAsset || mockAssets[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Top Banner Success Hero */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-[#0c1220] border border-emerald-500/40 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
          <CheckCircle2 className="w-9 h-9 animate-bounce-slow" />
        </div>

        <Badge variant="success" size="md" dot>
          Cryptographic Sealing Complete
        </Badge>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Your Work Has Been Registered
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Immutable provenance generated and indexed into the dual-pipeline vector store. Your work is now protected against unauthorized copies and synthetic derivatives.
        </p>
      </div>

      {/* Main Asset & Hash Ledger Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Asset Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
            <img
              src={asset.imageUrl || asset.thumbnailUrl}
              alt={asset.title}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="success" size="xs">
                Verified Original
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Asset Title:</span>
              <span className="font-bold text-white truncate max-w-[200px]">{asset.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Asset ID:</span>
              <span className="font-mono text-cyan-400 font-bold">{asset.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp:</span>
              <span className="font-mono text-slate-300">
                {new Date(asset.registeredAt || Date.now()).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">License:</span>
              <span className="text-slate-200">{asset.license}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Perceptual Fingerprints & Neural Embeddings */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-300">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <span>Extracted Perceptual Fingerprints</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                L2-Indexed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block">pHash (Perceptual DCT)</span>
                <span className="text-cyan-400 font-bold">{asset.fingerprints?.pHash || '0x8f3c9e1a4b7d2f0e'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block">aHash (Average Luminance)</span>
                <span className="text-slate-300 font-bold">{asset.fingerprints?.aHash || '0xff818181818181ff'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block">dHash (Gradient Difference)</span>
                <span className="text-slate-300 font-bold">{asset.fingerprints?.dHash || '0x7c38383838383838'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block">WHash (Wavelet Transform)</span>
                <span className="text-slate-300 font-bold">{asset.fingerprints?.WHash || '0xe0f8fc7e3e000000'}</span>
              </div>
            </div>

            {/* Neural Embedding Signatures */}
            <div className="pt-2 space-y-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono">
                <Cpu className="w-4 h-4" />
                <span>Deep Semantic Embeddings (FastAPI Inference)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>CLIP Model:</span>
                  <span className="text-indigo-300">ViT-B/32 (512-dim Normalized)</span>
                </div>
                <div className="flex justify-between">
                  <span>DINOv2 Model:</span>
                  <span className="text-emerald-300">ViT-L/14 Registers (768-dim)</span>
                </div>
                <div className="flex justify-between">
                  <span>Vector Index:</span>
                  <span className="text-cyan-400">pgvector IVFFlat (140,000+ Enclave Items)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Ready Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Provenance Certificate Ready</h4>
                <p className="text-xs text-slate-400 font-mono">ID: {asset.certificateId || 'VF-CERT-2026-0814-8821'}</p>
              </div>
            </div>

            <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`}>
              <Button variant="glow" size="sm" icon={Award}>
                View Certificate
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Nav Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <Link to="/assets">
          <Button variant="outline" size="sm" icon={Eye}>
            Go to My Assets
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/register">
            <Button variant="secondary" size="sm">
              Register Another Image
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistrationResult;
