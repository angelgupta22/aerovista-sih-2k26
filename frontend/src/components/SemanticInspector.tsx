import React, { useState } from 'react';
import { Building2, X, Focus } from 'lucide-react';
import type { SemanticAsset } from '../types/api';

interface SemanticInspectorProps {
  inspectedObject: SemanticAsset | null;
  onClose: () => void;
  onFocusObject?: (position: [number, number, number]) => void;
}

export const SemanticInspector: React.FC<SemanticInspectorProps> = ({
  inspectedObject,
  onClose,
  onFocusObject
}) => {
  const [filterClass, setFilterClass] = useState<string>('ALL');

  const sampleAssets: SemanticAsset[] = [
    {
      id: 'BUILDING_STRUCTURE_#14',
      class_name: 'BUILDING',
      height_meters: 14.8,
      footprint_sq_meters: 1240,
      confidence_pct: 94,
      geometry_status: 'OBSERVED / SCALE-LOCKED',
      position: [0, 8, 0]
    },
    {
      id: 'BUILDING_STRUCTURE_#02',
      class_name: 'BUILDING',
      height_meters: 22.4,
      footprint_sq_meters: 1890,
      confidence_pct: 91,
      geometry_status: 'OBSERVED / SCALE-LOCKED',
      position: [-18, 12, 10]
    },
    {
      id: 'ROAD_NETWORK_SEGMENT_A',
      class_name: 'ROAD',
      height_meters: 0.2,
      footprint_sq_meters: 3400,
      confidence_pct: 96,
      geometry_status: 'SURFACE FIT',
      position: [10, 0, -15]
    },
    {
      id: 'VEGETATION_CANOPY_#08',
      class_name: 'VEGETATION',
      height_meters: 6.5,
      footprint_sq_meters: 420,
      confidence_pct: 87,
      geometry_status: 'VOLUMETRIC FIT',
      position: [-10, 3, -8]
    },
    {
      id: 'VEHICLE_REMOVED_#01',
      class_name: 'DYNAMIC_VEHICLE',
      height_meters: 1.6,
      footprint_sq_meters: 12,
      confidence_pct: 98,
      geometry_status: 'DYNAMIC FILTERED',
      position: [5, 1, 12]
    }
  ];

  const currentObject = inspectedObject || sampleAssets[0];

  const filteredAssets = sampleAssets.filter((a) => {
    return filterClass === 'ALL' || a.class_name === filterClass;
  });

  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2 text-white font-extrabold font-outfit">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span className="tracking-wider">SEMANTIC OBJECT INSPECTOR</span>
        </div>
        {inspectedObject && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selected Object Detail Card */}
      {currentObject && (
        <div className="glass-card p-3.5 rounded-xl border border-cyan-500/30 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-cyan-300 font-outfit text-xs">{currentObject.id}</span>
            <button
              onClick={() => onFocusObject && onFocusObject(currentObject.position)}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition flex items-center gap-1 text-[10px] font-bold"
              title="Focus 3D Viewport Camera"
            >
              <Focus className="w-3.5 h-3.5" /> Focus 3D
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg">
              <span className="text-slate-400 font-sans">Semantic Class:</span>
              <span className="font-bold text-white">{currentObject.class_name}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg">
              <span className="text-slate-400 font-sans">Height Δz:</span>
              <span className="font-bold text-cyan-300">{currentObject.height_meters.toFixed(1)} m</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg">
              <span className="text-slate-400 font-sans">Footprint Area:</span>
              <span className="font-bold text-white">{currentObject.footprint_sq_meters.toLocaleString()} m²</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg">
              <span className="text-slate-400 font-sans">Confidence:</span>
              <span className="font-bold text-emerald-400">{currentObject.confidence_pct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Asset Inventory List */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 tracking-wider">RECONSTRUCTED ASSETS</span>
          <span className="text-[10px] font-mono text-cyan-400">{filteredAssets.length} objects</span>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[9px] font-bold font-mono">
          {['ALL', 'BUILDING', 'ROAD', 'VEGETATION'].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-2 py-1 rounded-lg border transition whitespace-nowrap ${
                filterClass === cls
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Asset List Items */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onFocusObject && onFocusObject(asset.position)}
              className="glass-card p-2 rounded-xl border border-white/5 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-between text-[11px]"
            >
              <div>
                <div className="font-bold text-white font-outfit">{asset.id}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {asset.class_name} • {asset.height_meters}m
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {asset.confidence_pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
