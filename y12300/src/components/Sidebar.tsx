import { Thermometer, Route, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useMuseumStore } from '@/store/museum-store';
import HeatmapPanel from '@/components/HeatmapPanel';
import RoutePanel from '@/components/RoutePanel';

export default function Sidebar() {
  const sidebarTab = useMuseumStore((s) => s.sidebarTab);
  const setSidebarTab = useMuseumStore((s) => s.setSidebarTab);
  const sidebarCollapsed = useMuseumStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useMuseumStore((s) => s.setSidebarCollapsed);

  return (
    <div
      className={`h-full bg-[#0F1923]/90 backdrop-blur-xl border-l border-white/5 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-10' : 'w-80'
      }`}
    >
      <div className="flex items-center justify-between px-2 h-10 border-b border-white/5 shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarTab('heatmap')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-t transition-colors ${
                sidebarTab === 'heatmap'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              热力映射
            </button>
            <button
              onClick={() => setSidebarTab('route')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-t transition-colors ${
                sidebarTab === 'route'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              路线播放
            </button>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white/80 transition-colors"
        >
          {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
        </button>
      </div>

      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'heatmap' ? <HeatmapPanel /> : <RoutePanel />}
        </div>
      )}
    </div>
  );
}
