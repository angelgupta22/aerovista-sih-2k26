import React, { useState } from 'react';
import { Eye, ShieldAlert, CheckCircle2, Sparkles, Navigation, MousePointerClick } from 'lucide-react';
import { apiService } from '../services/api';
import type { LineOfSightResult } from '../types/api';

interface LineOfSightPanelProps {
  missionId: string | null;
  onLosResult: (result: LineOfSightResult) => void;
  selectedPoints: [number, number, number][];
  isPickingPoint: boolean;
  setIsPickingPoint: (v: boolean) => void;
}

export const LineOfSightPanel: React.FC<LineOfSightPanelProps> = ({
  missionId,
  onLosResult,
  selectedPoints,
  isPickingPoint,
  setIsPickingPoint
}) => {
  const [result, setResult] = useState<LineOfSightResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestLOS = async () => {
    if (!missionId) return;

    const observer = selectedPoints[0] || [-10.0, 5.0, 15.0];
    const target = selectedPoints[1] || [12.0, 55.0, 2.0];

    setLoading(true);
    try {
      const res = await apiService.analyzeLineOfSight(
        missionId,
        observer,
        target
      );
      setResult(res);
      onLosResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-2 text-white font-extrabold font-outfit border-b border-white/10 pb-2.5">
        <Eye className="w-4 h-4 text-cyan-400" />
        <span className="tracking-wider">RAY-CASTING LINE-OF-SIGHT (LOS)</span>
      </div>

      <p className="text-slate-400 text-[11px] leading-relaxed">
        Casts 3D vectors through reconstructed scene geometry to test line-of-sight visibility and flag structural obstructions.
      </p>

      {/* Point Selection Box */}
      <div className="glass-card p-3 rounded-xl border border-indigo-500/20 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4 text-indigo-400" />
            Pick Observer & Target
          </span>
          <button
            onClick={() => setIsPickingPoint(!isPickingPoint)}
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border transition ${
              isPickingPoint
                ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-white/10 hover:border-indigo-500/40'
            }`}
          >
            {isPickingPoint ? 'CLICK CANVAS' : 'PICK'}
          </button>
        </div>

        <div className="flex gap-2 text-[10px] font-mono">
          <div className="flex-1 p-1.5 rounded bg-slate-900 border border-white/5 truncate">
            Obs: {selectedPoints[0] ? `${selectedPoints[0][0].toFixed(1)}, ${selectedPoints[0][2].toFixed(1)}` : 'Building 1 roof'}
          </div>
          <div className="flex-1 p-1.5 rounded bg-slate-900 border border-white/5 truncate">
            Tgt: {selectedPoints[1] ? `${selectedPoints[1][0].toFixed(1)}, ${selectedPoints[1][2].toFixed(1)}` : 'Road surface'}
          </div>
        </div>
      </div>

      <button
        onClick={handleTestLOS}
        disabled={loading || !missionId}
        className="w-full glass-card hover:bg-cyan-500/20 text-cyan-300 font-bold py-2.5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 transition flex items-center justify-center gap-2 shadow-lg"
      >
        <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>{loading ? 'Casting 3D Rays...' : 'Test Observer ➔ Target Line-of-Sight'}</span>
      </button>

      {result && (
        <div className="glass-card p-3.5 rounded-xl border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between font-bold">
            <span className="text-slate-300">Visibility Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border ${
                result.status === 'CLEAR'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {result.status === 'CLEAR' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              )}
              {result.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300 font-mono text-[11px]">
            <span className="text-slate-400 font-sans">Total Ray Range:</span>
            <span>{result.total_distance_meters} m</span>
          </div>

          {result.obstruction && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1.5 text-rose-300 text-[11px]">
              <div className="font-bold text-rose-400 flex items-center gap-1.5 font-sans">
                <Navigation className="w-3.5 h-3.5 rotate-45" /> Obstruction Collision Detected:
              </div>
              <div className="font-mono">• {result.obstruction.object_name}</div>
              <div className="font-mono">• Distance: {result.obstruction.distance_from_observer_meters} m</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
