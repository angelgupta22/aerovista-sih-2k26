import React from 'react';
import { Layers, Eye, AlertOctagon, Palette, Sliders, Navigation, Box, Cloud } from 'lucide-react';

interface LayerControlsProps {
  showPointCloud: boolean;
  setShowPointCloud: (v: boolean) => void;
  showMesh: boolean;
  setShowMesh: (v: boolean) => void;
  showWireframe: boolean;
  setShowWireframe: (v: boolean) => void;
  showTrajectory: boolean;
  setShowTrajectory: (v: boolean) => void;
  showDisasterLayer: boolean;
  setShowDisasterLayer: (v: boolean) => void;
  colorMode: 'RGB' | 'HEIGHT' | 'CONFIDENCE' | 'SEMANTIC';
  setColorMode: (mode: 'RGB' | 'HEIGHT' | 'CONFIDENCE' | 'SEMANTIC') => void;
  pointSize: number;
  setPointSize: (size: number) => void;
  showFog: boolean;
  setShowFog: (v: boolean) => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  showPointCloud,
  setShowPointCloud,
  showMesh,
  setShowMesh,
  showWireframe,
  setShowWireframe,
  showTrajectory,
  setShowTrajectory,
  showDisasterLayer,
  setShowDisasterLayer,
  colorMode,
  setColorMode,
  pointSize,
  setPointSize,
  showFog,
  setShowFog
}) => {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between text-white font-extrabold font-outfit border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="tracking-wider">3D DIGITAL TWIN LAYERS</span>
        </div>
        <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
          LIVE SCENE
        </span>
      </div>

      {/* Geometry Toggles Group */}
      <div className="space-y-1.5">
        {/* Point Cloud Geometry */}
        <label className="flex items-center justify-between p-2.5 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer transition border border-white/5 hover:border-cyan-500/30">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>3D Point Cloud Geometry</span>
          </div>
          <input
            type="checkbox"
            checked={showPointCloud}
            onChange={(e) => setShowPointCloud(e.target.checked)}
            className="accent-cyan-500 rounded w-4 h-4 cursor-pointer"
          />
        </label>

        {/* Surface Mesh */}
        <label className="flex items-center justify-between p-2.5 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer transition border border-white/5 hover:border-indigo-500/30">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Box className="w-4 h-4 text-indigo-400" />
            <span>Poisson Surface Mesh</span>
          </div>
          <input
            type="checkbox"
            checked={showMesh}
            onChange={(e) => setShowMesh(e.target.checked)}
            className="accent-indigo-500 rounded w-4 h-4 cursor-pointer"
          />
        </label>

        {/* Wireframe Mesh Overlay */}
        {showMesh && (
          <label className="flex items-center justify-between p-2 pl-8 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer transition border border-white/5">
            <span className="text-slate-300 text-[11px] font-medium">• Wireframe Mesh Grid</span>
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
              className="accent-indigo-400 rounded w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        )}

        {/* 6-DoF UAV Trajectory */}
        <label className="flex items-center justify-between p-2.5 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer transition border border-white/5 hover:border-cyan-500/30">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>6-DoF UAV Flight Trajectory</span>
          </div>
          <input
            type="checkbox"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
            className="accent-cyan-500 rounded w-4 h-4 cursor-pointer"
          />
        </label>

        {/* Disaster Mode Overlay */}
        <label className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 hover:bg-rose-900/30 cursor-pointer transition border border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Disaster Response Mode</span>
          </div>
          <input
            type="checkbox"
            checked={showDisasterLayer}
            onChange={(e) => setShowDisasterLayer(e.target.checked)}
            className="accent-rose-500 rounded w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Color Shading Mode Selector */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
          <Palette className="w-3.5 h-3.5 text-cyan-400" />
          <span>COLOR RENDERING & SHADING</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/5">
          {(['RGB', 'HEIGHT', 'CONFIDENCE', 'SEMANTIC'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition ${
                colorMode === mode
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Point Particle Size & Fog Controls */}
      <div className="space-y-3 pt-1 border-t border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Particle Size
            </span>
            <span className="font-mono text-cyan-300 font-bold">{pointSize.toFixed(2)}m</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.80"
            step="0.05"
            value={pointSize}
            onChange={(e) => setPointSize(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        <label className="flex items-center justify-between text-slate-300 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-indigo-400" />
            Atmospheric Haze Fog
          </span>
          <input
            type="checkbox"
            checked={showFog}
            onChange={(e) => setShowFog(e.target.checked)}
            className="accent-indigo-400 rounded w-3.5 h-3.5 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
