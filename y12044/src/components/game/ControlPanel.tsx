import React, { useState } from 'react';
import { Wrench, Zap, ArrowRight, AlertTriangle } from 'lucide-react';
import { useGameStore, useCurrentRoundConflicts } from '../../store/useGameStore';
import { NetworkNode, Operator } from '../../types/game';
import { nodeTypeLabels } from '../../data/initialState';

interface ControlPanelProps {
  selectedNode?: string;
  nodes: NetworkNode[];
}

const ControlPanel: React.FC<ControlPanelProps> = ({ selectedNode, nodes }) => {
  const { addAction, currentActions, nextRound, isGameOver } = useGameStore();
  const conflicts = useCurrentRoundConflicts();
  const [selectedOperator, setSelectedOperator] = useState<Operator>('ice_team');

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  const maintenanceActions = [
    { id: 'repair', name: '紧急维修', effect: { health: 15 }, icon: Wrench },
    { id: 'upgrade', name: '升级容量', effect: { capacity: 20 }, icon: Zap },
  ];

  const handleAction = (action: typeof maintenanceActions[0]) => {
    if (!selectedNode) return;
    
    addAction({
      nodeId: selectedNode,
      operator: selectedOperator,
      action: action.name,
      effect: action.effect,
    });
  };

  const nodeActions = currentActions.filter(a => a.nodeId === selectedNode);
  const hasConflict = conflicts.some(c => c.nodeId === selectedNode);

  return (
    <div className="bg-space-800 rounded-xl p-4 glow-border">
      <h3 className="font-orbitron text-lg font-bold text-tech-400 mb-4">
        操作控制台
      </h3>

      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">选择维护团队</div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedOperator('ice_team')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selectedOperator === 'ice_team'
                ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                : 'bg-space-700 text-gray-400 border border-transparent hover:bg-space-600'
            }`}
          >
            ❄️ 冰矿队
          </button>
          <button
            onClick={() => setSelectedOperator('recycle_team')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selectedOperator === 'recycle_team'
                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                : 'bg-space-700 text-gray-400 border border-transparent hover:bg-space-600'
            }`}
          >
            ♻️ 回收队
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">目标设备</div>
        {selectedNodeData ? (
          <div className="p-3 bg-space-700 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {selectedNodeData.type === 'ice_mine' ? '❄️' : 
                 selectedNodeData.type === 'pump' ? '⚙️' :
                 selectedNodeData.type === 'greenhouse' ? '🌱' :
                 selectedNodeData.type === 'recycler' ? '♻️' : '🏠'}
              </span>
              <div>
                <div className="font-medium">{selectedNodeData.name}</div>
                <div className="text-xs text-gray-400">
                  {nodeTypeLabels[selectedNodeData.type]} · 健康度 {selectedNodeData.health}%
                </div>
              </div>
            </div>
            {hasConflict && (
              <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                <AlertTriangle size={12} />
                <span>存在维护冲突，需要解决</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-space-700 rounded-lg text-gray-500 text-sm text-center">
            点击地图上的设备选择
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">执行操作</div>
        <div className="space-y-2">
          {maintenanceActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={!selectedNode || isGameOver}
                className="w-full flex items-center gap-3 p-3 bg-space-700 rounded-lg hover:bg-space-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
              >
                <div className="p-2 bg-tech-400/20 rounded-lg group-hover:bg-tech-400/30 transition-colors">
                  <Icon className="text-tech-400" size={18} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{action.name}</div>
                  <div className="text-xs text-gray-400">
                    {action.effect.health && `健康度 +${action.effect.health}`}
                    {action.effect.capacity && `容量 +${action.effect.capacity}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {nodeActions.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">本回合已执行</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {nodeActions.map((action, idx) => (
              <div key={idx} className="text-xs p-2 bg-space-700 rounded flex justify-between">
                <span>{action.operator === 'ice_team' ? '❄️' : '♻️'} {action.action}</span>
                <span className="text-gray-400">
                  {action.effect.health && `+${action.effect.health}HP`}
                  {action.effect.capacity && `+${action.effect.capacity}容量`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={nextRound}
        disabled={isGameOver}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-mars-500 to-mars-400 text-white font-bold rounded-lg hover:from-mars-400 hover:to-mars-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-mars-500/30"
      >
        <span>下一回合</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default ControlPanel;
