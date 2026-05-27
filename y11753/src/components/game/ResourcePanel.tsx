import { motion } from 'framer-motion';
import { Plane, Droplets, Wrench, Clock, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { ResourceType, RESOURCE_CONFIG } from '../../types';

const resourceIcons: Record<ResourceType, typeof Plane> = {
  drone: Plane,
  cleaner: Droplets,
  repair: Wrench
};

const resourceColors: Record<ResourceType, string> = {
  drone: 'from-cyan-500 to-blue-500',
  cleaner: 'from-green-500 to-emerald-500',
  repair: 'from-orange-500 to-amber-500'
};

interface ResourcePanelProps {
  onDragStart: (resourceId: string) => void;
  onDragEnd: () => void;
}

export const ResourcePanel = ({ onDragStart, onDragEnd }: ResourcePanelProps) => {
  const { resources, battery, dispatchResource } = useGameStore();

  const handleDragStart = (e: any, resourceId: string) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('resourceId', resourceId);
    }
    onDragStart(resourceId);
  };

  const handleClick = (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource || resource.status !== 'available') return;
    
    const areas = useGameStore.getState().level?.mapLayout || [];
    const panelAreas = areas.filter(a => a.type === 'panel');
    if (panelAreas.length > 0) {
      const targetArea = panelAreas[Math.floor(Math.random() * panelAreas.length)];
      const action = resource.type === 'drone' ? 'inspect' : resource.type === 'cleaner' ? 'clean' : 'repair';
      dispatchResource(resourceId, targetArea.id, action);
    }
  };

  return (
    <div className="p-4 border-b border-slate-700">
      <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        可用资源
      </h3>
      
      <div className="space-y-3">
        {resources.map((resource) => {
          const Icon = resourceIcons[resource.type];
          const config = RESOURCE_CONFIG[resource.type];
          const isAvailable = resource.status === 'available';
          const isWorking = resource.status === 'working';
          const isCooling = resource.status === 'cooling';
          const canUse = isAvailable && battery >= resource.batteryCost;

          return (
            <motion.div
              key={resource.id}
              draggable={canUse}
              onDragStart={(e) => canUse && handleDragStart(e, resource.id)}
              onDragEnd={onDragEnd}
              onClick={() => canUse && handleClick(resource.id)}
              whileHover={canUse ? { scale: 1.02 } : {}}
              whileTap={canUse ? { scale: 0.98 } : {}}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isAvailable
                  ? canUse
                    ? 'bg-slate-700/50 border-slate-600 cursor-grab hover:border-slate-500 active:cursor-grabbing'
                    : 'bg-slate-800/50 border-slate-700 opacity-60 cursor-not-allowed'
                  : isWorking
                  ? 'bg-blue-900/30 border-blue-500/50'
                  : 'bg-slate-800/50 border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${resourceColors[resource.type]}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white truncate">{resource.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isAvailable ? 'bg-green-500/20 text-green-400' :
                      isWorking ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {isAvailable ? '可用' : isWorking ? '工作中' : '冷却中'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      {config.batteryCost}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {config.cooldown}s
                    </span>
                  </div>
                </div>
              </div>

              {(isCooling || isWorking) && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{isWorking ? '工作进度' : '冷却剩余'}</span>
                    <span>
                      {isWorking
                        ? `${Math.round(resource.workProgress || 0)}%`
                        : `${Math.ceil(resource.cooldownTime)}s`}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{
                        width: isWorking
                          ? `${resource.workProgress || 0}%`
                          : `${(resource.cooldownTime / resource.totalCooldown) * 100}%`
                      }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${
                        isWorking ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                    />
                  </div>
                </div>
              )}

              {isAvailable && battery < resource.batteryCost && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <span>电量不足</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
        <p className="text-xs text-slate-400">
          💡 拖拽资源到地图区域或点击资源快速调度
        </p>
      </div>
    </div>
  );
};
