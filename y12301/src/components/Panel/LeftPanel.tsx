import { Layers, Building2, Wind, TreeDeciduous, CircleDot, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LayerState } from '../../types';
import { cn } from '../../utils/cn';

const layerConfigs: {
  key: keyof LayerState;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: 'buildings', label: '建筑体块', icon: Building2, color: 'text-blue-400' },
  { key: 'windCorridors', label: '风廊通道', icon: Wind, color: 'text-cyan-400' },
  { key: 'openSpaces', label: '开敞空间', icon: TreeDeciduous, color: 'text-green-400' },
  { key: 'windRose', label: '风向玫瑰', icon: CircleDot, color: 'text-purple-400' },
];

export function LeftPanel() {
  const layers = useAppStore((state) => state.layers);
  const setLayerVisible = useAppStore((state) => state.setLayerVisible);
  const buildingOpacity = useAppStore((state) => state.buildingOpacity);
  const setBuildingOpacity = useAppStore((state) => state.setBuildingOpacity);
  const buildings = useAppStore((state) => state.buildings);
  const selectedEntity = useAppStore((state) => state.selectedEntity);
  const setSelectedEntity = useAppStore((state) => state.setSelectedEntity);

  const buildingStatusColors: Record<string, string> = {
    normal: 'bg-green-500',
    pending: 'bg-yellow-500',
    anomaly: 'bg-red-500',
  };

  return (
    <div className="w-64 h-full bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">图层控制</h2>
        </div>

        <div className="space-y-2">
          {layerConfigs.map((config) => {
            const Icon = config.icon;
            const isActive = layers[config.key];
            return (
              <button
                key={config.key}
                onClick={() => setLayerVisible(config.key, !isActive)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', config.color)} />
                  <span className="text-sm">{config.label}</span>
                </div>
                {isActive ? (
                  <Eye className="w-4 h-4 text-cyan-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label className="text-xs text-slate-400 mb-2 block">建筑透明度</label>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={buildingOpacity}
            onChange={(e) => setBuildingOpacity(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>透明</span>
            <span>{Math.round(buildingOpacity * 100)}%</span>
            <span>不透明</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
          建筑列表 ({buildings.length})
        </h3>
        <div className="space-y-2">
          {buildings.map((building) => (
            <button
              key={building.id}
              onClick={() =>
                setSelectedEntity(selectedEntity === building.id ? null : building.id)
              }
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left',
                selectedEntity === building.id
                  ? 'bg-cyan-500/20 border border-cyan-500/50'
                  : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  buildingStatusColors[building.status]
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{building.name}</div>
                <div className="text-xs text-slate-400">
                  {building.dimensions.height}m · {building.dimensions.width}×{building.dimensions.depth}m
                </div>
              </div>
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: building.color }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-400">
              {buildings.filter((b) => b.status === 'normal').length}
            </div>
            <div className="text-xs text-slate-400">正常</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-bold text-yellow-400">
              {buildings.filter((b) => b.status === 'pending').length}
            </div>
            <div className="text-xs text-slate-400">待确认</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-bold text-red-400">
              {buildings.filter((b) => b.status === 'anomaly').length}
            </div>
            <div className="text-xs text-slate-400">异常</div>
          </div>
        </div>
      </div>
    </div>
  );
}
