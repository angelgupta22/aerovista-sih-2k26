import React, { useState } from 'react';
import { Download, Radio, Sparkles, Upload, ChevronDown, Layers, FileCode, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onExport: (format: 'ply' | 'obj') => void;
  isProcessing: boolean;
  currentStep: string;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onExport,
  isProcessing,
  currentStep,
  hasData
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="h-16 glass-panel border-b border-white/10 px-8 flex items-center justify-between z-30 relative backdrop-blur-2xl">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center space-x-4">
        <div className="relative group cursor-pointer" onClick={onOpenUpload}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-black font-outfit tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300">
              AEROVISTA
            </h1>
            <span className="text-[10px] font-mono tracking-widest bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
              v1.0 SINGLE-PASS UAV
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-2">
            AI 3D Reconstruction & Geospatial Digital Twin Engine
          </p>
        </div>
      </div>

      {/* Center: Live Status & Telemetry Badge */}
      <div className="hidden lg:flex items-center space-x-3 glass-pill px-5 py-1.5 rounded-full border border-cyan-500/20 shadow-md">
        <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs text-slate-200 font-medium font-outfit">
          {isProcessing ? (
            <span className="text-cyan-300 font-semibold animate-pulse">{currentStep}</span>
          ) : hasData ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span>●</span> Scene Reconstruction Active • 3D Digital Twin Ready
            </span>
          ) : (
            <span className="text-slate-300">System Ready • Select Mission to Execute</span>
          )}
        </span>
      </div>

      {/* Right: Actions & Config YAML Badge */}
      <div className="flex items-center space-x-3">
        {/* YAML Config Badge */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono font-bold bg-slate-900/80 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
          <span>config.yaml</span>
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!hasData}
            className="glass-pill hover:bg-slate-800 text-slate-200 disabled:opacity-40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition border border-white/10 hover:border-cyan-500/40 shadow-sm"
            title="Export Reconstructed 3D Assets"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export 3D Assets</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && hasData && (
            <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl border border-cyan-500/30 shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  onExport('ply');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Export Point Cloud (.PLY)</span>
              </button>
              <button
                onClick={() => {
                  onExport('obj');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition"
              >
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Export Surface Mesh (.OBJ)</span>
              </button>
            </div>
          )}
        </div>

        {/* Start UAV Mission Button */}
        <button
          onClick={onOpenUpload}
          disabled={isProcessing}
          className="relative group overflow-hidden bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 bg-[length:200%_auto] hover:bg-right text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-xl shadow-cyan-500/25 disabled:opacity-50 transition-all duration-500 flex items-center gap-2"
        >
          <Upload className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
          <span>{isProcessing ? 'Processing...' : 'Run UAV Mission'}</span>
        </button>
      </div>
    </header>
  );
};
