import React from 'react';
import { CheckCircle2, Loader2, Circle, Activity, Cpu, Sparkles } from 'lucide-react';

interface PipelineMonitorPanelProps {
  currentStep: string;
  progress: number;
  isProcessing: boolean;
}

export const PipelineMonitorPanel: React.FC<PipelineMonitorPanelProps> = ({
  currentStep,
  progress,
  isProcessing
}) => {
  const steps = [
    { name: 'Ingestion & Quality Assessment', pctRange: [0, 15] },
    { name: 'Camera Calibration', pctRange: [15, 25] },
    { name: 'Visual Odometry (VIO)', pctRange: [25, 40] },
    { name: 'VO Scale Registration', pctRange: [40, 50] },
    { name: 'Depth Estimation', pctRange: [50, 70] },
    { name: '3D Point Cloud Fusion', pctRange: [70, 80] },
    { name: 'Meshing & Texturing', pctRange: [80, 90] },
    { name: 'Confidence & Disaster Analysis', pctRange: [90, 100] }
  ];

  const getStepStatus = (pctRange: number[]) => {
    if (progress >= pctRange[1]) return 'COMPLETED';
    if (progress >= pctRange[0] && isProcessing) return 'IN_PROGRESS';
    return 'PENDING';
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2 text-white font-extrabold font-outfit">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="tracking-wider">PIPELINE MONITOR</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
            isProcessing
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
              : progress === 100
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-white/10'
          }`}
        >
          {isProcessing ? 'RUNNING' : progress === 100 ? 'FINISHED' : 'STANDBY'}
        </span>
      </div>

      {/* Main Overall Progress Bar */}
      <div className="glass-card p-3 rounded-xl border border-white/10 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-cyan-300 truncate font-outfit">{currentStep || 'Ready to execute'}</span>
          <span className="font-mono text-cyan-400 font-bold">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-white/10 p-[1px]">
          <div
            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 8-Stage Execution Stepper */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.pctRange);
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                status === 'IN_PROGRESS'
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md'
                  : status === 'COMPLETED'
                  ? 'glass-card border-emerald-500/20 opacity-90'
                  : 'glass-card border-white/5 opacity-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : status === 'IN_PROGRESS' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}

                <span
                  className={`text-xs font-medium font-outfit ${
                    status === 'IN_PROGRESS'
                      ? 'text-cyan-300 font-bold'
                      : status === 'COMPLETED'
                      ? 'text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {step.name}
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                Step {idx + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hardware Compute Runtime Footer */}
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Mode:
        </span>
        <span className="font-mono text-cyan-300 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> GPU / WLS Accelerated
        </span>
      </div>
    </div>
  );
};
