import React from 'react';
import { AlertOctagon, ShieldAlert, Car, Compass } from 'lucide-react';
import type { DisasterAnalytics } from '../types/api';

interface DisasterPanelProps {
  disasterData: DisasterAnalytics | null;
  onFocusLocation?: (point: [number, number, number]) => void;
}

export const DisasterPanel: React.FC<DisasterPanelProps> = ({
  disasterData,
  onFocusLocation
}) => {
  const damaged = disasterData?.damaged_structures || [
    {
      id: 'DAMAGED_BLDG_#03',
      severity: 'CRITICAL',
      structural_integrity_pct: 34,
      location: [5.2, 18.4, 12.0],
      description: 'Roof collapse & structural wall shear failure'
    },
    {
      id: 'DAMAGED_BLDG_#07',
      severity: 'MODERATE',
      structural_integrity_pct: 68,
      location: [-14.5, 32.1, 8.5],
      description: 'Facade damage & partial debris spillover'
    }
  ];

  const blockedRoads = disasterData?.blocked_roads || [
    {
      id: 'ROAD_BLOCK_#01',
      road_name: 'Main Access Highway N4',
      obstruction_type: 'Concrete Debris',
      blockage_pct: 85,
      location: [12.0, 45.0, 1.5]
    }
  ];

  const clearancePct = disasterData?.accessible_route_clearance_pct || 72;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4 w-80 text-xs backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2 text-white font-extrabold font-outfit">
          <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="tracking-wider">DISASTER RESPONSE INTELLIGENCE</span>
        </div>
        <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-bold">
          EMERGENCY MODE
        </span>
      </div>

      {/* Access Route Clearance Gauge */}
      <div className="glass-card p-3 rounded-xl border border-rose-500/20 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-rose-400" />
            Accessible Route Clearance
          </span>
          <span className="font-mono text-rose-400 font-extrabold text-sm">{clearancePct}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10 p-[1px]">
          <div
            className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${clearancePct}%` }}
          />
        </div>
      </div>

      {/* Critical Stats Summary */}
      <div className="grid grid-cols-2 gap-2 text-center font-mono">
        <div className="glass-card p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] text-slate-400 font-sans">Damaged Buildings</div>
          <div className="text-rose-400 font-extrabold text-base">{disasterData?.damaged_structures_count || 2}</div>
        </div>
        <div className="glass-card p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] text-slate-400 font-sans">Road Blockages</div>
          <div className="text-amber-400 font-extrabold text-base">{disasterData?.blocked_roads_count || 1}</div>
        </div>
      </div>

      {/* Damaged Structures List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>DAMAGED STRUCTURE INVENTORY</span>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {damaged.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onFocusLocation && onFocusLocation(item.location as [number, number, number])}
              className="glass-card p-2.5 rounded-xl border border-rose-500/20 hover:border-rose-400 transition cursor-pointer space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white font-outfit">{item.id}</span>
                <span className="text-[9px] font-mono font-bold bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                  {item.severity}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{item.description}</p>
              <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-slate-300">
                <span>Integrity: {item.structural_integrity_pct}%</span>
                <span className="text-cyan-400 hover:underline">Focus 3D ➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Roads List */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="text-[11px] font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-amber-400" />
          <span>BLOCKED ACCESSIBILITY ROADS</span>
        </div>

        {blockedRoads.map((road, idx) => (
          <div
            key={idx}
            onClick={() => onFocusLocation && onFocusLocation(road.location as [number, number, number])}
            className="glass-card p-2.5 rounded-xl border border-amber-500/20 hover:border-amber-400 transition cursor-pointer space-y-1"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-white font-outfit">{road.road_name}</span>
              <span className="text-[9px] font-mono font-bold text-amber-400">
                {road.blockage_pct}% Blocked
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Obstruction: {road.obstruction_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
