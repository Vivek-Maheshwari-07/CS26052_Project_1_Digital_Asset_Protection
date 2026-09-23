import React from 'react';
import { CheckCircle2, Loader2, Sparkles, Cpu, Shield, Search, Database, Award } from 'lucide-react';
import ProgressBar from '../ui/Progress';

export const ProcessingSteps = ({
  steps = [],
  currentStepIndex = 1,
  title = 'Processing Dual-Pipeline Verification...',
  subtitle = 'Connecting with FastAPI neural enclaves & pgvector index.'
}) => {
  const progressPercentage = Math.round((currentStepIndex / steps.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 mb-2">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-400">{subtitle}</p>
      </div>

      {/* Main Progress Indicator */}
      <ProgressBar value={progressPercentage} max={100} size="md" color="cyan" showLabel label="Overall Pipeline Progress" />

      {/* Individual Stage Checklist */}
      <div className="space-y-3 pt-2">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStepIndex;
          const isCurrent = stepNum === currentStepIndex;
          const isPending = stepNum > currentStepIndex;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-blue-950/40 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                  : isDone
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-40 text-slate-500'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-slate-600">
                    {stepNum}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? 'text-cyan-300' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                {step.detail && isCurrent && (
                  <p className="text-[11px] text-slate-400 mt-0.5 animate-in fade-in leading-tight">
                    {step.detail}
                  </p>
                )}
              </div>

              {isDone && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Completed
                </span>
              )}
              {isCurrent && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30 animate-pulse">
                  Executing
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
        <p className="text-[11px] text-slate-500 font-mono">
          FastAPI Enclave Task ID: <span className="text-cyan-400">task_exec_vf_{Date.now().toString().slice(-6)}</span>
        </p>
      </div>
    </div>
  );
};

export default ProcessingSteps;
