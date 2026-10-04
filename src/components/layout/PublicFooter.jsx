import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Activity, Sparkles, Terminal } from 'lucide-react';

export const PublicFooter = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070b12] text-slate-400 text-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#0c1220] rounded-[6px] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">VeriFrame</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered Image Provenance Verification platform surviving extreme compression, cropping, and neural manipulation.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Registry Enclave: Operational</span>
            </div>
          </div>

          {/* Core Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 font-mono">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/gallery" className="hover:text-cyan-400 transition-colors">
                  Public Provenance Gallery
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-cyan-400 transition-colors">
                  Register Original Work
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-cyan-400 transition-colors">
                  Verify Suspicious Image
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">
                  Creator Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Forensic Pipeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 font-mono">
              Dual-Pipeline Tech
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="text-cyan-400">▪</span> Perceptual Hashes (pHash, aHash, dHash, WHash)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-blue-400">▪</span> Semantic Embeddings (CLIP ViT-B/32)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-indigo-400">▪</span> Self-Supervised Features (DINOv2)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">▪</span> pgvector Vector Indexing
              </li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 font-mono">
              Security & Integrity
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Algorithmic fusion score combines Hamming distance with dense vector cosine similarity.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
              <span className="font-semibold text-white">Cryptographic Sealing:</span> SHA-256 integrity digest & Ed25519 signatures.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 VeriFrame Protocol. Built for digital asset protection & provenance verification.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">FastAPI Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
