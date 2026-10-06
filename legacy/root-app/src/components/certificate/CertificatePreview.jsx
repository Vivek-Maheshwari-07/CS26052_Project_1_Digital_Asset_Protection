import React from 'react';
import {
  ShieldCheck,
  Download,
  Printer,
  Share2,
  QrCode,
  Lock,
  Award,
  CheckCircle2,
  Calendar,
  Key
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useToast } from '../../context/ToastContext';

export const CertificatePreview = ({ certificate }) => {
  const toast = useToast();

  if (!certificate) return null;

  const handleDownload = () => {
    toast.success('Certificate Downloaded', `Certificate ${certificate.certificateId}.pdf is downloading.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.info('Link Copied', 'Provenance certificate link copied to clipboard.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Top Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm" dot>
            Verified Cryptographic Seal
          </Badge>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            ID: {certificate.certificateId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Share2} onClick={handleShare}>
            Share Link
          </Button>
          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint} className="hidden sm:inline-flex">
            Print
          </Button>
          <Button variant="glow" size="sm" icon={Download} onClick={handleDownload}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* Official Certificate Paper Container */}
      <div className="relative bg-[#0c1322] border-2 border-slate-700/80 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl certificate-border text-slate-100 overflow-hidden">
        {/* Subtle Guilloche Background Pattern */}
        <div className="absolute inset-0 forensic-grid opacity-20 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-3 pb-8 border-b border-slate-700/60">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20 mb-2 flex items-center justify-center">
            <div className="w-full h-full bg-[#0c1322] rounded-[14px] flex items-center justify-center">
              <Award className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <span className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-cyan-400">
            VERIFRAME CRYPTOGRAPHIC REGISTRY
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            CERTIFICATE OF PROVENANCE
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
            This digital certificate establishes immutable ownership, timestamped registration, and dual-pipeline perceptual fingerprinting for the registered original work.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AUTHENTICATED • BLOCK #{certificate.semanticVectors?.registryBlockHeight || 184920}</span>
          </div>
        </div>

        {/* Certificate Body Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 py-8 border-b border-slate-700/60 items-center">
          {/* Left Thumbnail */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden bg-black/80 border-2 border-slate-700 shadow-2xl p-1">
              <img
                src={certificate.imageUrl}
                alt={certificate.title}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-2">
              SEALED ASSET PREVIEW
            </span>
          </div>

          {/* Right Details */}
          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Asset Title
                </span>
                <span className="text-sm sm:text-base font-bold text-white block truncate">
                  {certificate.title}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Registered Creator
                </span>
                <span className="text-sm sm:text-base font-bold text-cyan-300 block truncate">
                  {certificate.ownerName || certificate.creator}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Certificate ID
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block truncate">
                  {certificate.certificateId}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Timestamp (UTC)
                </span>
                <span className="text-xs font-mono text-slate-200 block truncate">
                  {certificate.issuedAt}
                </span>
              </div>
            </div>

            {/* Hashes Matrix */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Dual-Pipeline Perceptual Fingerprints
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">pHash:</span>
                  <span className="text-cyan-400 font-bold">{certificate.perceptualFingerprints?.pHash}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">aHash:</span>
                  <span className="text-slate-300 font-bold">{certificate.perceptualFingerprints?.aHash}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">dHash:</span>
                  <span className="text-slate-300 font-bold">{certificate.perceptualFingerprints?.dHash}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">WHash:</span>
                  <span className="text-slate-300 font-bold">{certificate.perceptualFingerprints?.WHash}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Signatures & QR Seal */}
        <div className="relative z-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Visual QR Code Seal Placeholder */}
            <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
              <div className="w-16 h-16 bg-slate-900 rounded-lg flex flex-col items-center justify-center p-1 text-cyan-400">
                <QrCode className="w-10 h-10 text-white" />
                <span className="text-[8px] font-mono font-bold text-slate-300 uppercase">SCAN VERIFY</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-white">Cryptographic Protocol Seal</p>
              <p className="text-slate-400 text-[11px]">Issuer: {certificate.issuer}</p>
              <p className="text-[10px] font-mono text-cyan-400 truncate max-w-xs">
                Sig: {certificate.digitalSignature}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="inline-block border-t border-slate-600 px-6 pt-2">
              <p className="text-xs font-mono font-bold text-slate-200">VeriFrame Trust Engine</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Automated Cryptographic Authority</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatePreview;
