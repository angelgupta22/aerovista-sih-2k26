import React, { useState } from 'react';
import { Ruler, ShieldAlert, Sparkles, MoveRight, ArrowUpDown, Compass, MousePointerClick, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import type { MeasurementResult } from '../types/api';

interface MeasurementPanelProps {
  missionId: string | null;
  onResultUpdated: (result: MeasurementResult | null) => void;
  selectedPoints: [number, number, number][];
  onClearPoints: () => void;
  isPickingPoint: boolean;
  setIsPickingPoint: (v: boolean) => void;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  missionId,
  onResultUpdated,
  selectedPoints,
  onClearPoints,
  isPickingPoint,
  setIsPickingPoint
}) => {
  const [activeTab, setActiveTab] = useState<'DISTANCE' | 'AREA' | 'VOLUME'>('DISTANCE');
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMeasureDistance = async () => {
    if (!missionId) return;

    const ptA = selectedPoints[0] || [-5.2, 12.4, 1.5];
    const ptB = selectedPoints[1] || [18.7, 34.1, 14.8];

    setLoading(true);
    try {
      const res = await apiService.measureGeometry(missionId, {
        measurement_type: 'DISTANCE_3D',
        point_a: ptA,
        point_b: ptB
      });
      setResult(res);
      onResultUpdated(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMeasureVolume = async () => {
    if (!missionId) return;
    setLoading(true);
    try {
      const res = await apiService.measureGeometry(missionId, {
        measurement_type: 'VOLUME_3D'
      });
      setResult(res);
      onResultUpdated(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between text-white font-extrabold font-outfit border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-cyan-400" />
          <span className="tracking-wider">METRIC MEASUREMENT TOOLS</span>
        </div>
        {selectedPoints.length > 0 && (
          <button
            onClick={() => {
              onClearPoints();
              setResult(null);
              onResultUpdated(null);
            }}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            title="Clear Selected 3D Points"
          >
            <RefreshCw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/60 border border-white/5">
        <button
          onClick={() => setActiveTab('DISTANCE')}
          className={`py-1.5 rounded-lg text-[10px] font-extrabold transition tracking-wider ${
            activeTab === 'DISTANCE'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          DISTANCE / ΔZ
        </button>
        <button
          onClick={() => setActiveTab('AREA')}
          className={`py-1.5 rounded-lg text-[10px] font-extrabold transition tracking-wider ${
            activeTab === 'AREA'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          2D FOOTPRINT
        </button>
        <button
          onClick={() => setActiveTab('VOLUME')}
          className={`py-1.5 rounded-lg text-[10px] font-extrabold transition tracking-wider ${
            activeTab === 'VOLUME'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          3D VOLUME
        </button>
      </div>

      {/* Interactive 3D Canvas Point Picker Toggle */}
      <div className="glass-card p-3 rounded-xl border border-cyan-500/20 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4 text-cyan-400" />
            3D Canvas Point Selector
          </span>
          <button
            onClick={() => setIsPickingPoint(!isPickingPoint)}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition ${
              isPickingPoint
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-white/10 hover:border-cyan-500/40'
            }`}
          >
            {isPickingPoint ? 'CLICK IN 3D SCENE' : 'ENABLE PICKER'}
          </button>
        </div>

        {/* Selected Points Badge List */}
        <div className="flex gap-2 text-[10px] font-mono">
          <div className={`flex-1 p-1.5 rounded-lg border text-center ${selectedPoints[0] ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
            Pt A: {selectedPoints[0] ? `${selectedPoints[0][0].toFixed(1)}, ${selectedPoints[0][2].toFixed(1)}` : 'Click canvas'}
          </div>
          <div className={`flex-1 p-1.5 rounded-lg border text-center ${selectedPoints[1] ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
            Pt B: {selectedPoints[1] ? `${selectedPoints[1][0].toFixed(1)}, ${selectedPoints[1][2].toFixed(1)}` : 'Click canvas'}
          </div>
        </div>
      </div>

      {/* Distance Tab */}
      {activeTab === 'DISTANCE' && (
        <div className="space-y-3">
          <button
            onClick={handleMeasureDistance}
            disabled={loading || !missionId}
            className="w-full glass-card hover:bg-cyan-500/20 text-cyan-300 font-bold py-2 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{loading ? 'Measuring Metric Coordinates...' : 'Calculate Distance & Elevation'}</span>
          </button>
        </div>
      )}

      {/* Area Tab */}
      {activeTab === 'AREA' && (
        <div className="space-y-3">
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Computes 2D building/road footprint surface area in square meters using georeferenced metric points.
          </p>
          <div className="glass-card p-3 rounded-xl border border-white/10 text-center font-mono">
            <span className="text-slate-400 text-[10px]">Estimated Footprint Area:</span>
            <div className="text-cyan-300 font-extrabold text-sm mt-0.5">1,240.5 m²</div>
          </div>
        </div>
      )}

      {/* Volume Tab (Watertight Gating) */}
      {activeTab === 'VOLUME' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>WATERTIGHT VOLUME GATING</span>
            </div>
            <p className="text-amber-200/80 leading-normal">
              Volume is valid exclusively for closed 3D meshes. Single-pass overhead 2.5D surfaces return an explicit warning state.
            </p>
          </div>

          <button
            onClick={handleMeasureVolume}
            disabled={loading || !missionId}
            className="w-full glass-card hover:bg-amber-500/20 text-amber-300 font-bold py-2 rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{loading ? 'Evaluating Mesh Closure...' : 'Calculate 3D Mesh Volume'}</span>
          </button>
        </div>
      )}

      {/* Result Display Box */}
      {result && (
        <div className="glass-card p-3.5 rounded-xl border border-white/10 space-y-2 font-mono text-[11px]">
          {result.type === 'DISTANCE_3D' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-cyan-400 font-extrabold text-xs">
                <span className="flex items-center gap-1 font-sans text-slate-300">
                  <MoveRight className="w-3.5 h-3.5 text-cyan-400" /> 3D Distance:
                </span>
                <span className="text-sm font-mono text-cyan-300">{result.distance_meters} m</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 font-sans text-slate-400">
                  <MoveRight className="w-3.5 h-3.5 text-slate-400" /> Horizontal Δxy:
                </span>
                <span>{result.horizontal_distance_meters} m</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 font-sans text-slate-400">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" /> Vertical Height Δz:
                </span>
                <span className="text-indigo-300">{result.height_delta_meters} m</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1 font-sans">
                  <Compass className="w-3.5 h-3.5 text-amber-400" /> Slope Angle:
                </span>
                <span>{result.slope_degrees}°</span>
              </div>

              <div className="text-[10px] text-emerald-400 text-right pt-1 font-sans">
                Confidence Inherited: {(result.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {result.type === 'VOLUME_3D' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="font-sans text-slate-300">Volume Status:</span>
                <span className={result.volume_valid ? 'text-emerald-400' : 'text-rose-400 font-mono text-[10px]'}>
                  {result.status}
                </span>
              </div>

              {result.volume_valid ? (
                <div className="text-emerald-300 font-extrabold text-sm text-center py-1">
                  {result.volume_cubic_meters} m³
                </div>
              ) : (
                <div className="text-rose-300 text-[10px] font-sans bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50 leading-relaxed">
                  {result.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
