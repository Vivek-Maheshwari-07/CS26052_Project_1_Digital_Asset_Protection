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
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import assetService from '../services/assetService';
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
      change: '142k images indexed',
      icon: Search,
      color: 'from-cyan-600 to-teal-600'
    },
    {
      label: 'Potential Matches',
      value: user?.stats?.potentialMatches || 2,
      change: '1 requires review',
      alert: true,
      icon: AlertTriangle,
      color: 'from-amber-600 to-orange-600'
    },
    {
      label: 'Certificates Issued',
      value: user?.stats?.certificatesIssued || 14,
      change: 'All Verified',
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
              Dashboard
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Good morning, {user?.name || 'Alex Vance'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Welcome to your digital asset protection dashboard. Register your original works and check images for copies.
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
                Asset Protection
              </Badge>
              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                REGISTER ORIGINAL WORK
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Create a permanent record for your artwork or photograph. The system generates unique image fingerprints to protect your work from unauthorized use and copying.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Start Registration</span>
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
                Image Verification
              </Badge>
              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                VERIFY SUSPICIOUS IMAGE
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Upload any suspicious image to check if it matches an existing registered work in the database. View similarity metrics, visual comparison, and confidence scores.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Start Verification</span>
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
              Your registered original works
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
    </div>
  );
};

export default Dashboard;
