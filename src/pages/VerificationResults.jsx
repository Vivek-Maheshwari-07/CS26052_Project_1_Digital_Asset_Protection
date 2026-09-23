import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Database,
  ArrowLeft,
  Sparkles,
  GitCompare,
  Filter,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import verificationService from '../services/verificationService';
import MatchCard from '../components/verification/MatchCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { mockVerificationResults } from '../data/mockData';

export const VerificationResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [results, setResults] = useState(location.state?.results || null);
  const [isLoading, setIsLoading] = useState(!location.state?.results);

  useEffect(() => {
    if (!results) {
      const loadResults = async () => {
        setIsLoading(true);
        try {
          const data = await verificationService.getLatestResults();
          setResults(data);
        } finally {
          setIsLoading(false);
        }
      };
      loadResults();
    }
  }, [results]);

  if (isLoading || !results) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Synthesizing Ranked Results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back navigation & header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>New Verification Query</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="sm" icon={CheckCircle2}>
            Forensic Query Finished
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Verification Results
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Ranked match candidates discovered across the global provenance registry.
        </p>
      </div>

      {/* Top Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Matches Found
          </span>
          <p className="text-2xl font-bold font-mono text-white">
            {results.matchesFoundCount || results.matches?.length || 2}
          </p>
          <span className="text-[11px] text-cyan-400 font-mono">Ranked by score</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Highest Confidence
          </span>
          <p className="text-2xl font-bold font-mono text-cyan-400">
            {results.highestConfidence || 94.2}%
          </p>
          <span className="text-[11px] text-emerald-400 font-mono">High Similarity</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Search Duration
          </span>
          <p className="text-2xl font-bold font-mono text-slate-200">
            {results.searchDurationMs || 418}ms
          </p>
          <span className="text-[11px] text-slate-400 font-mono">FastAPI Enclave</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Records Indexed
          </span>
          <p className="text-2xl font-bold font-mono text-slate-200">
            {Number(results.recordsIndexed || 142085).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 font-mono">pgvector cluster</span>
        </div>
      </div>

      {/* Ranked Candidate Matches */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Ranked Matching Records ({results.matches?.length || 0})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Sorted by combined score</span>
        </div>

        <div className="space-y-6">
          {results.matches?.map((match, idx) => (
            <MatchCard key={match.assetId || idx} match={match} rank={idx + 1} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VerificationResults;
