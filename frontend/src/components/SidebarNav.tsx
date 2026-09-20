import React from 'react';
import { Layers, Ruler, Eye, Building2, AlertTriangle, Activity } from 'lucide-react';

export type SidebarTab = 'LAYERS' | 'MEASURE' | 'LOS' | 'ASSETS' | 'DISASTER' | 'PIPELINE';

interface SidebarNavProps {
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab | null) => void;
  isProcessing: boolean;
  disasterCount: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  isProcessing,
  disasterCount
}) => {
  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'LAYERS',
      label: 'Layers & Shading',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'MEASURE',
      label: '3D Measurements',
      icon: <Ruler className="w-4 h-4" />
    },
    {
      id: 'LOS',
      label: 'Line-of-Sight',
      icon: <Eye className="w-4 h-4" />
    },
    {
      id: 'ASSETS',
      label: 'Semantic Objects',
      icon: <Building2 className="w-4 h-4" />
    },
    {
      id: 'DISASTER',
      label: 'Disaster Mode',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      badge: disasterCount > 0 ? disasterCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      id: 'PIPELINE',
      label: 'Pipeline Monitor',
      icon: <Activity className={`w-4 h-4 ${isProcessing ? 'animate-spin text-cyan-400' : ''}`} />
    }
  ];

  return (
    <div className="glass-panel rounded-2xl border border-white/10 p-1.5 flex items-center space-x-1.5 shadow-2xl backdrop-blur-2xl pointer-events-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(isActive ? null : tab.id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-outfit transition group relative ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
            title={tab.label}
          >
            <span className={`${isActive ? 'text-white' : 'text-cyan-400 group-hover:scale-110 transition-transform'}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${tab.badgeColor || 'bg-cyan-500/20 text-cyan-300'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
