
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, Thermometer, Eye, EyeOff } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import { HeatmapMini } from './HeatmapMini';

export function LeftPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const floors = useDataStore(state => state.floors);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  const toggleFloor = useFilterStore(state => state.toggleFloor);
  const showHeatmap = useFilterStore(state => state.showHeatmap);
  const setShowHeatmap = useFilterStore(state => state.setShowHeatmap);
  const showTrajectory = useFilterStore(state => state.showTrajectory);
  const setShowTrajectory = useFilterStore(state => state.setShowTrajectory);
  const showBeacons = useFilterStore(state => state.showBeacons);
  const setShowBeacons = useFilterStore(state => state.setShowBeacons);
  const showProblems = useFilterStore(state => state.showProblems);
  const setShowProblems = useFilterStore(state => state.setShowProblems);
  
  if (collapsed) {
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-slate-800/90 backdrop-blur-sm p-2 rounded-r-lg border border-slate-700 border-l-0 hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-cyan-400" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="absolute left-4 top-20 bottom-4 w-72 z-10 flex flex-col">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">楼层与视图</h3>
              <p className="text-gray-500 text-xs">控制显示内容</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              楼层选择
            </h4>
            <div className="space-y-2">
              {floors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => toggleFloor(floor.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedFloors.includes(floor.id)
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: floor.color }}
                  />
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium">{floor.name}</div>
                    <div className="text-gray-500 text-xs">Level {floor.level}</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedFloors.includes(floor.id)
                      ? 'border-cyan-400 bg-cyan-400'
                      : 'border-slate-600'
                  }`}>
                    {selectedFloors.includes(floor.id) && (
                      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              显示控制
            </h4>
            <div className="space-y-2">
              <ToggleRow
                icon={<Thermometer className="w-4 h-4" />}
                label="信号热力图"
                active={showHeatmap}
                onToggle={() => setShowHeatmap(!showHeatmap)}
              />
              <ToggleRow
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8M12 4v8M8 8h8" />
                </svg>}
                label="定位轨迹"
                active={showTrajectory}
                onToggle={() => setShowTrajectory(!showTrajectory)}
              />
              <ToggleRow
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                </svg>}
                label="蓝牙信标"
                active={showBeacons}
                onToggle={() => setShowBeacons(!showBeacons)}
              />
              <ToggleRow
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>}
                label="问题标记"
                active={showProblems}
                onToggle={() => setShowProblems(!showProblems)}
              />
            </div>
          </div>
          
          {selectedFloors.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                信号热力图 - 俯视图
              </h4>
              <HeatmapMini floorId={selectedFloors[selectedFloors.length - 1]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, active, onToggle }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        active
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
      }`}
    >
      <div className={`p-2 rounded-lg ${active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-gray-400'}`}>
        {icon}
      </div>
      <span className={`flex-1 text-left text-sm ${active ? 'text-white' : 'text-gray-400'}`}>
        {label}
      </span>
      {active ? (
        <Eye className="w-4 h-4 text-green-400" />
      ) : (
        <EyeOff className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );
}

