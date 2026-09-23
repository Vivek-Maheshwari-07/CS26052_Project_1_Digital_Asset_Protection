import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  FolderLock,
  Award,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Fingerprint,
  Sparkles,
  GitCompare,
  CheckCircle2,
  Clock,
  Layers,
  Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import assetService from '../services/assetService';
import { mockNotifications } from '../data/mockData';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import AssetCard from '../components/assets/AssetCard';

export const Dashboard = () => {
  const { user } = useAuth();
  const [recentAssets, setRecentAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const assets = await assetService.getAssets();
        setRecentAssets(assets || []);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const stats = [
    {
      label: 'Registered Assets',
      value: user?.stats?.registeredAssets || recentAssets.length || 14,
      change: '+2 this month',
      icon: FolderLock,
      color: 'from-blue-600 to-indigo-600'
    },
    {
      label: 'Verification Checks',
      value: user?.stats?.verificationChecks || 128,
      change: '142k indexed',
      icon: Search,
      color: 'from-cyan-600 to-teal-600'
    },
    {
      label: 'Potential Match Alerts',
      value: user?.stats?.potentialMatches || 3,
      change: '1 requires review',
      alert: true,
      icon: AlertTriangle,
      color: 'from-amber-600 to-orange-600'
    },
    {
      label: 'Provenance Certificates',
      value: user?.stats?.certificatesIssued || 14,
      change: '100% Sealed',
      icon: Award,
      color: 'from-emerald-600 to-green-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* 1. Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-[#0c1220] border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Workstation Enclave
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Good morning, {user?.name || 'Alex Vance'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Your cryptographic provenance repository is fully synchronized with dual-pipeline vector indices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/register">
            <Button variant="primary" size="sm" icon={Plus}>
              Register New Work
            </Button>
          </Link>
          <Link to="/verify">
            <Button variant="glow" size="sm" icon={Search}>
              Verify Image
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Quick Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${stat.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {stat.value}
                </span>
                <p className={`text-xs mt-1 ${stat.alert ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                  {stat.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Large Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/register" className="group">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30 group-hover:border-blue-400/60 transition-all shadow-xl flex flex-col justify-between h-full space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <Badge variant="primary" size="xs">
                Permanent Sealing
              </Badge>
              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                REGISTER ORIGINAL WORK
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Create a permanent provenance record for your image. Generate pHash, aHash, dHash, WHash and CLIP/DINOv2 embeddings to protect against theft and unauthorized AI training.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Start Registration Process</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        <Link to="/verify" className="group">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-cyan-500/30 group-hover:border-cyan-400/60 transition-all shadow-xl flex flex-col justify-between h-full space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <Badge variant="cyan" size="xs">
                Forensic Analysis
              </Badge>
              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                VERIFY SUSPICIOUS IMAGE
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Search the registry for matching or manipulated content. Calculate Hamming distance, cosine similarity, and combined confidence score with deep forensic evidence reports.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Launch Forensic Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* 4. Recent Registered Assets Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Recent Registered Assets
            </h2>
            <p className="text-xs text-slate-400">
              Your active cryptographic provenance portfolio
            </p>
          </div>
          <Link to="/assets">
            <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
              View All ({recentAssets.length})
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentAssets.slice(0, 3).map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      </div>

      {/* 5. Live Match / Activity Feed Bar */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Forensic Enclave Alerts & Logs</span>
          </div>
          <Link to="/notifications" className="text-xs text-cyan-400 hover:underline">
            All Notifications
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60">
          {mockNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200">{n.title}:</span>
                <span className="text-slate-400 line-clamp-1">{n.message}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono text-slate-500">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
                {n.evidenceId && (
                  <Link to={`/evidence/${n.evidenceId}`}>
                    <Button variant="outline" size="xs">
                      Inspect
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
