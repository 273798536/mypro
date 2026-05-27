import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, CheckCircle, Clock, Zap, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Area, Fault, Resource, FaultType, WEATHER_CONFIG, FAULT_TYPE_CONFIG, PRIORITY_CONFIG, FaultPriority } from '../../types';

const weatherIcons: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudLightning
};

interface GameMapProps {
  draggedResource: string | null;
  onDragEnd: () => void;
}

export const GameMap = ({ draggedResource, onDragEnd }: GameMapProps) => {
  const { level, faults, resources, dispatchResource } = useGameStore();
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, areaId: string) => {
    e.preventDefault();
    const resourceId = e.dataTransfer.getData('resourceId');
    if (resourceId) {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        const action = resource.type === 'drone' ? 'inspect' : resource.type === 'cleaner' ? 'clean' : 'repair';
        dispatchResource(resourceId, areaId, action);
      }
    }
    onDragEnd();
  }, [resources, dispatchResource, onDragEnd]);

  const handleAreaClick = (areaId: string) => {
    setSelectedArea(selectedArea === areaId ? null : areaId);
  };

  const getAreaFaults = (areaId: string): Fault[] => {
    return faults.filter(f => f.areaId === areaId && (f.status === 'pending' || f.status === 'processing'));
  };

  const getAreaResources = (areaId: string): Resource[] => {
    return resources.filter(r => r.currentTarget === areaId);
  };

  const getFaultIcon = (type: FaultType) => {
    switch (type) {
      case 'panel_dirty': return '🧹';
      case 'inverter_fault': return '⚡';
      case 'wire_damage': return '🔌';
      default: return '❓';
    }
  };

  if (!level) return null;

  return (
    <div className="flex-1 relative bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#10B981 1px, transparent 1px), linear-gradient(90deg, #10B981 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {level.weatherChangeRate > 0 && (
          <div className="bg-slate-800/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              {(() => {
                const WeatherIcon = weatherIcons[useGameStore.getState().weather];
                return (
                  <>
                    <WeatherIcon className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm font-medium">{WEATHER_CONFIG[useGameStore.getState().weather].name}</span>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="relative w-full h-full p-8">
        <div className="relative w-full h-full max-w-4xl mx-auto">
          {level.mapLayout.map((area) => {
            const areaFaults = getAreaFaults(area.id);
            const areaResources = getAreaResources(area.id);
            const hasFault = areaFaults.length > 0;
            const hasResource = areaResources.length > 0;
            const isHovered = hoveredArea === area.id;
            const isSelected = selectedArea === area.id;
            const canDrop = draggedResource !== null;

            let areaBg = 'bg-slate-800/50';
            let areaBorder = 'border-slate-700';
            
            if (area.type === 'panel') {
              areaBg = 'bg-blue-900/20';
              areaBorder = 'border-blue-700/50';
            } else if (area.type === 'inverter') {
              areaBg = 'bg-orange-900/20';
              areaBorder = 'border-orange-700/50';
            } else if (area.type === 'substation') {
              areaBg = 'bg-purple-900/20';
              areaBorder = 'border-purple-700/50';
            }

            if (hasFault) {
              const priorityOrder: Record<FaultPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
              const highestPriority = areaFaults.reduce<FaultPriority>((max, f) => {
                return priorityOrder[f.priority] > priorityOrder[max] ? f.priority : max;
              }, 'low');
              
              if (highestPriority === 'critical') {
                areaBorder = 'border-red-500';
              } else if (highestPriority === 'high') {
                areaBorder = 'border-orange-500';
              } else {
                areaBorder = 'border-yellow-500';
              }
            }

            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`absolute rounded-xl border-2 transition-all cursor-pointer ${areaBg} ${areaBorder} ${
                  isHovered && canDrop ? 'ring-2 ring-green-400 ring-opacity-50 scale-105' : ''
                } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
                style={{
                  left: `${area.position.x}px`,
                  top: `${area.position.y}px`,
                  width: `${area.size.width}px`,
                  height: `${area.size.height}px`
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, area.id)}
                onMouseEnter={() => setHoveredArea(area.id)}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => handleAreaClick(area.id)}
              >
                <div className="p-3 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white truncate">{area.name}</h4>
                    {area.type === 'panel' && (
                      <span className="text-xs text-blue-400">光伏</span>
                    )}
                    {area.type === 'inverter' && (
                      <span className="text-xs text-orange-400">逆变</span>
                    )}
                    {area.type === 'substation' && (
                      <span className="text-xs text-purple-400">变电</span>
                    )}
                  </div>

                  {area.type === 'panel' && (
                    <div className="flex-1 flex flex-wrap gap-1 content-start">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-4 rounded-sm ${
                            area.cleanliness > 80 ? 'bg-blue-500/60' :
                            area.cleanliness > 50 ? 'bg-blue-500/40' :
                            'bg-blue-500/20'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {hasFault && (
                    <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                      {areaFaults.slice(0, 3).map((fault) => (
                        <motion.div
                          key={fault.id}
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-lg"
                          style={{ backgroundColor: PRIORITY_CONFIG[fault.priority].color }}
                        >
                          {getFaultIcon(fault.type)}
                        </motion.div>
                      ))}
                      {areaFaults.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          +{areaFaults.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {hasResource && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {areaResources.map((resource) => (
                        <motion.div
                          key={resource.id}
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-xs"
                        >
                          {resource.type === 'drone' ? '🛸' : resource.type === 'cleaner' ? '🚿' : '🔧'}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {area.type === 'panel' && (
                    <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                      {area.cleanliness}%
                    </div>
                  )}
                </div>

                {isHovered && canDrop && (
                  <div className="absolute inset-0 bg-green-500/10 rounded-xl flex items-center justify-center pointer-events-none">
                    <span className="text-green-400 font-bold text-sm">释放以调度</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedArea && (
          <AreaDetailPanel
            area={level.mapLayout.find(a => a.id === selectedArea)!}
            faults={getAreaFaults(selectedArea)}
            resources={getAreaResources(selectedArea)}
            onClose={() => setSelectedArea(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface AreaDetailPanelProps {
  area: Area;
  faults: Fault[];
  resources: Resource[];
  onClose: () => void;
}

const AreaDetailPanel = ({ area, faults, resources, onClose }: AreaDetailPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800/95 backdrop-blur border-l border-slate-700 p-4 overflow-y-auto z-20"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{area.name}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {faults.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              当前故障 ({faults.length})
            </h4>
            <div className="space-y-2">
              {faults.map((fault) => (
                <div
                  key={fault.id}
                  className="p-3 rounded-lg bg-slate-700/50 border-l-4"
                  style={{ borderColor: PRIORITY_CONFIG[fault.priority].color }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">
                      {FAULT_TYPE_CONFIG[fault.type].name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: PRIORITY_CONFIG[fault.priority].color + '30', color: PRIORITY_CONFIG[fault.priority].color }}
                    >
                      {PRIORITY_CONFIG[fault.priority].name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{fault.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">来源: {fault.source}</span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Clock className="w-3 h-3" />
                      {Math.max(0, Math.ceil(fault.deadline - useGameStore.getState().currentTime))}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resources.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              执行中任务 ({resources.length})
            </h4>
            <div className="space-y-2">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-3 rounded-lg bg-cyan-900/30 border border-cyan-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{resource.name}</span>
                    <span className="text-xs text-cyan-400">
                      {resource.type === 'drone' ? '巡检中' : resource.type === 'cleaner' ? '清洁中' : '维修中'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${resource.workProgress || 0}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-slate-400 mt-1">
                    {Math.round(resource.workProgress || 0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {faults.length === 0 && resources.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400">该区域运行正常</p>
          </div>
        )}

        {area.type === 'panel' && (
          <div className="p-3 rounded-lg bg-slate-700/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">清洁度</span>
              <span className="text-sm font-medium text-white">{area.cleanliness}%</span>
            </div>
            <div className="h-2 bg-slate-600 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  area.cleanliness > 80 ? 'bg-green-500' :
                  area.cleanliness > 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${area.cleanliness}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
