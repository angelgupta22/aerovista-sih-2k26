import React from 'react';
import type { ScaleRegistration, ConfidenceStats } from '../types/api';
import { Cpu, Layers, Crosshair, ShieldCheck, MapPin, Eye, RotateCcw, Compass, Play, Pause } from 'lucide-react';

interface TelemetryBarProps {
  scaleMeta: ScaleRegistration | null;
  confidenceStats: ConfidenceStats | null;
  numPoints: number;
  numKeyframes: number;
  onCameraPreset: (mode: 'TOP' | 'ISO' | 'FRONT' | 'RESET') => void;
  isAutoRotating: boolean;
  onToggleAutoRotate: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  scaleMeta,
  confidenceStats,
  numPoints,
  numKeyframes,
  onCameraPreset,
  isAutoRotating,
  onToggleAutoRotate
}) => {
  const scaleConfPct = scaleMeta ? Math.round(scaleMeta.scale_confidence * 100) : 0;
  const reconConfPct = confidenceStats ? Math.round(confidenceStats.reconstruction_confidence) : 0;

  return (
    <div className="absolute bottom-4 left-6 right-6 z-20 pointer-events-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      
      {/* Telemetry Metrics Grid */}
      <div className="glass-panel p-3 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        
        {/* 1. VO Scale Registration (Module 4B FIX) */}
        <div className="glass-card p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-between group hover:border-emerald-500/40 transition">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Crosshair className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">VO SCALE CONFIDENCE</div>
              <div className="text-emerald-400 font-extrabold text-xs font-mono flex items-center gap-1">
                <span>{scaleMeta ? `${scaleConfPct}%` : 'STANDBY'}</span>
                {scaleMeta && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">
                    S={scaleMeta.scale_factor.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="w-7 h-7 relative flex items-center justify-center hidden sm:flex">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-emerald-400 stroke-current" strokeDasharray={`${scaleConfPct}, 100`} strokeWidth="3" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-[8px] font-mono font-bold text-emerald-300">{scaleConfPct}%</span>
          </div>
        </div>

        {/* 2. Reconstructed Points & Keyframes */}
        <div className="glass-card p-2.5 rounded-xl border border-cyan-500/20 flex items-center space-x-2.5 group hover:border-cyan-500/40 transition">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">FUSED 3D POINT CLOUD</div>
            <div className="text-white font-extrabold text-xs font-mono flex items-center gap-1">
              <span>{numPoints.toLocaleString()}</span>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-300 px-1 py-0.2 rounded font-sans">
                {numKeyframes} kf
              </span>
            </div>
          </div>
        </div>

        {/* 3. Overall Reconstruction Quality */}
        <div className="glass-card p-2.5 rounded-xl border border-indigo-500/20 flex items-center space-x-2.5 group hover:border-indigo-500/40 transition">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">SCENE RECON CONFIDENCE</div>
            <div className="text-indigo-300 font-extrabold text-xs font-mono flex items-center gap-1">
              <span>{confidenceStats ? `${reconConfPct}%` : 'N/A'}</span>
              <span className="text-[9px] text-slate-400 font-sans font-normal">
                ({confidenceStats?.high_confidence_pct || 0}% High)
              </span>
            </div>
          </div>
        </div>

        {/* 4. Hardware Compute Badge */}
        <div className="glass-card p-2.5 rounded-xl border border-slate-700/60 flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">COMPUTE ACCELERATION</div>
            <div className="text-slate-200 font-semibold text-[11px] flex items-center gap-1">
              <span>NVIDIA / PyTorch</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          </div>
        </div>

        {/* 5. Geospatial CRS Frame Status */}
        <div className="glass-card p-2.5 rounded-xl border border-amber-500/20 flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">GEOSPATIAL FRAME</div>
            <div className="text-amber-300 font-bold text-[11px]">
              {scaleMeta?.is_scaled ? 'WGS84 / Metric ENU' : 'UNSCALED Relative'}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Viewport Camera Toolbar */}
      <div className="glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex items-center space-x-1 shrink-0">
        <button
          onClick={() => onCameraPreset('TOP')}
          className="glass-pill hover:bg-slate-800 p-2 rounded-xl text-slate-300 hover:text-white transition text-xs font-bold font-mono flex items-center gap-1"
          title="Top-Down Overhead 2D Map View"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">2D MAP</span>
        </button>

        <button
          onClick={() => onCameraPreset('ISO')}
          className="glass-pill hover:bg-slate-800 p-2 rounded-xl text-slate-300 hover:text-white transition text-xs font-bold font-mono flex items-center gap-1"
          title="Isometric 3D Perspective View"
        >
          <Eye className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">3D ISO</span>
        </button>

        <button
          onClick={onToggleAutoRotate}
          className={`p-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1 ${
            isAutoRotating
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'glass-pill text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Auto-Orbit Camera Rotation"
        >
          {isAutoRotating ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
          <span className="hidden sm:inline">{isAutoRotating ? 'ORBIT' : 'ORBIT'}</span>
        </button>

        <button
          onClick={() => onCameraPreset('RESET')}
          className="glass-pill hover:bg-slate-800 p-2 rounded-xl text-slate-300 hover:text-white transition"
          title="Reset Camera Position"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
