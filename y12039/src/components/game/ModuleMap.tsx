import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { Module } from '../../types/game';

const MODULE_SIZE = 80;

const getModuleColor = (status: Module['status']) => {
  switch (status) {
    case 'normal': return '#2ed573';
    case 'damaged': return '#ffa502';
    case 'critical': return '#ff4757';
    case 'repaired': return '#00d4ff';
    default: return '#64748b';
  }
};

const getModuleGlowClass = (status: Module['status']) => {
  switch (status) {
    case 'normal': return 'module-glow-normal';
    case 'damaged': return 'module-glow-damaged';
    case 'critical': return 'module-glow-critical';
    case 'repaired': return 'module-glow-repaired';
    default: return '';
  }
};

export const ModuleMap: React.FC = () => {
  const { modules, hasPowerNodes } = useGameStore();
  const [hoveredModule, setHoveredModule] = React.useState<string | null>(null);

  return (
    <div className="relative w-full h-full min-h-[400px] grid-bg rounded-xl overflow-hidden border border-cyber-cyan/20">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
        {modules.map(module =>
          module.connections.map(connId => {
            const targetModule = modules.find(m => m.id === connId);
            if (!targetModule || module.id > connId) return null;
            
            return (
              <line
                key={`line-${module.id}-${connId}`}
                x1={module.position.x}
                y1={module.position.y}
                x2={targetModule.position.x}
                y2={targetModule.position.y}
                stroke="rgba(0, 212, 255, 0.3)"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            );
          })
        )}
      </svg>

      {modules.map(module => (
        <div
          key={module.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${getModuleGlowClass(module.status)}`}
          style={{ left: module.position.x, top: module.position.y }}
          onMouseEnter={() => setHoveredModule(module.id)}
          onMouseLeave={() => setHoveredModule(null)}
        >
          <div
            className="relative"
            style={{ width: MODULE_SIZE, height: MODULE_SIZE }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon
                points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                fill="rgba(18, 38, 63, 0.9)"
                stroke={getModuleColor(module.status)}
                strokeWidth="3"
              />
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {module.name.slice(0, 2)}
              </text>
            </svg>

            {module.hasPowerNode && hasPowerNodes && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyber-cyan rounded-full power-node-ripple" />
            )}
          </div>

          {hoveredModule === module.id && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-10 bg-space-dark/95 border border-cyber-cyan/50 rounded-lg p-3 min-w-[150px] shadow-xl">
              <div className="text-sm font-bold text-cyber-cyan mb-2">{module.name}</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">状态:</span>
                  <span style={{ color: getModuleColor(module.status) }}>
                    {module.status === 'normal' ? '正常' : 
                     module.status === 'damaged' ? '损坏' :
                     module.status === 'critical' ? '危急' : '已修复'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">氧气消耗:</span>
                  <span className="text-white">{module.oxygenConsumption}/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">电力消耗:</span>
                  <span className="text-white">{module.powerConsumption}/s</span>
                </div>
                {module.hasPowerNode && hasPowerNodes && (
                  <div className="text-cyber-cyan text-xs mt-1">⚡ 含电力节点</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="absolute bottom-3 left-3 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2ed573' }} />
          <span className="text-gray-400">正常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffa502' }} />
          <span className="text-gray-400">损坏</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff4757' }} />
          <span className="text-gray-400">危急</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00d4ff' }} />
          <span className="text-gray-400">已修复</span>
        </div>
      </div>
    </div>
  );
};
