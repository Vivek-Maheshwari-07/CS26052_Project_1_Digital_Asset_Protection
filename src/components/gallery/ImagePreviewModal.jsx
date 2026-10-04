import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Calendar,
  User,
  Hash,
  ExternalLink,
  Award,
  Layers,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export const ImagePreviewModal = ({ asset, isOpen, onClose, onRequestDownload }) => {
  if (!asset) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" title="Asset Provenance Record">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Viewer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[300px] max-h-[500px]">
            <img
              src={asset.imageUrl || asset.thumbnailUrl}
              alt={asset.title}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="success" size="sm" icon={ShieldCheck}>
                {asset.verificationStatus || 'Verified Original'}
              </Badge>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Dimensions</p>
              <p className="text-xs font-semibold text-slate-200">{asset.dimensions}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Format</p>
              <p className="text-xs font-semibold text-slate-200">{asset.format}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">File Size</p>
              <p className="text-xs font-semibold text-slate-200">{asset.fileSize}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Fingerprints */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                {asset.category}
              </span>
              <h2 className="text-xl font-bold text-white mt-1 leading-snug">{asset.title}</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{asset.description}</p>
            </div>

            {/* Creator & Registry Info */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Registered Creator:</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  {asset.creator}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Timestamp (UTC):</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {new Date(asset.registeredAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">License:</span>
                <span className="text-slate-300 font-medium">{asset.license}</span>
              </div>
            </div>

            {/* Perceptual Hashes Snapshot */}
            {asset.fingerprints && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>Dual-Pipeline Fingerprints</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500">pHash:</span>
                    <span className="text-cyan-300">{asset.fingerprints.pHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">aHash:</span>
                    <span className="text-slate-300">{asset.fingerprints.aHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CLIP Vector:</span>
                    <span className="text-indigo-300">512-dim Normalized</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DINOv2 Vector:</span>
                    <span className="text-emerald-300">768-dim ViT-L/14</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <div className="flex gap-2">
              <Link to={`/assets/${asset.id}`} className="flex-1">
                <Button variant="glow" size="sm" icon={ExternalLink} className="w-full">
                  Full Asset Details
                </Button>
              </Link>
              <Link to={`/certificate/${asset.certificateId || 'VF-CERT-2026-0814-8821'}`} className="flex-1">
                <Button variant="secondary" size="sm" icon={Award} className="w-full">
                  Certificate
                </Button>
              </Link>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              Public browsing enabled • Cryptographically indexed provenance record
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
