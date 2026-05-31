import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Home, Trash2, Plus, Edit3 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const ControlPanel: React.FC = () => {
  const {
    phase,
    nodes,
    members,
    selectedNodeId,
    selectedMemberId,
    windLevel,
    targetWindLevel,
    budget,
    version,
    startGame,
    updateNode,
    addMember,
    removeMember,
    resetGame,
    goToMenu
  } = useGameStore();

  const [newMemberType, setNewMemberType] = useState<'beam' | 'damper' | 'spring'>('beam');
  const [startNode, setStartNode] = useState<string>('');
  const [endNode, setEndNode] = useState<string>('');
  const [nodeRemark, setNodeRemark] = useState('');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedMember = members.find(m => m.id === selectedMemberId);

  const handleAddMember = () => {
    if (!startNode || !endNode || startNode === endNode) return;

    const costs = { beam: 500, damper: 800, spring: 600 };
    const stiffness = { beam: 5000, damper: 3000, spring: 2000 };
    const damping = { beam: 50, damper: 200, spring: 30 };
    const maxStress = { beam: 1000, damper: 800, spring: 600 };

    addMember({
      startNodeId: startNode,
      endNodeId: endNode,
      type: newMemberType,
      stiffness: stiffness[newMemberType],
      damping: damping[newMemberType],
      maxStress: maxStress[newMemberType],
      cost: costs[newMemberType]
    });

    setStartNode('');
    setEndNode('');
  };

  const handleUpdateRemark = () => {
    if (selectedNodeId && nodeRemark.trim()) {
      updateNode(selectedNodeId, {}, nodeRemark.trim());
      setNodeRemark('');
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-700">
        <h3 className="text-white font-bold">控制面板</h3>
        <span className="text-xs text-slate-400 font-mono">v{version}</span>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          {phase === 'edit' && (
            <button
              onClick={startGame}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Play size={18} />
              开始模拟
            </button>
          )}
          {phase === 'simulating' && (
            <div className="flex-1 bg-cyan-600 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 animate-pulse">
              <Pause size={18} />
              模拟中...
            </div>
          )}
          <button
            onClick={resetGame}
            className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded-lg transition-colors"
            title="重置关卡"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={goToMenu}
            className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded-lg transition-colors"
            title="返回菜单"
          >
            <Home size={18} />
          </button>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">风载进度</span>
            <span className="text-cyan-400 font-mono">Lv.{windLevel} / {targetWindLevel}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${(windLevel / targetWindLevel) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">预算</span>
            <span className={`font-mono ${budget.used > budget.total ? 'text-red-400' : 'text-emerald-400'}`}>
              ¥{budget.used.toLocaleString()} / ¥{budget.total.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                budget.used / budget.total > 0.9 ? 'bg-red-500' :
                budget.used / budget.total > 0.7 ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((budget.used / budget.total) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {phase === 'edit' && (
        <>
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Plus size={16} />
              添加杆件
            </h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={startNode}
                  onChange={(e) => setStartNode(e.target.value)}
                  className="flex-1 bg-slate-700 text-white text-sm rounded px-3 py-2 border border-slate-600 focus:border-cyan-500 outline-none"
                >
                  <option value="">起始节点</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id} ({n.remark || '节点'})</option>
                  ))}
                </select>
                <select
                  value={endNode}
                  onChange={(e) => setEndNode(e.target.value)}
                  className="flex-1 bg-slate-700 text-white text-sm rounded px-3 py-2 border border-slate-600 focus:border-cyan-500 outline-none"
                >
                  <option value="">结束节点</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id} ({n.remark || '节点'})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                {(['beam', 'damper', 'spring'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setNewMemberType(type)}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      newMemberType === type
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {type === 'beam' ? '横梁 ¥500' : type === 'damper' ? '阻尼器 ¥800' : '弹簧 ¥600'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddMember}
                disabled={!startNode || !endNode || startNode === endNode}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-colors"
              >
                添加杆件
              </button>
            </div>
          </div>

          {selectedNode && (
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Edit3 size={16} />
                节点属性
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">节点ID:</span>
                  <span className="text-white font-mono">{selectedNode.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">位置:</span>
                  <span className="text-white font-mono">({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">类型:</span>
                  <span className={selectedNode.fixed ? 'text-slate-400' : 'text-cyan-400'}>
                    {selectedNode.fixed ? '固定支点' : '活动节点'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">当前备注:</span>
                  <span className="text-orange-400">{selectedNode.remark || '无'}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={nodeRemark}
                    onChange={(e) => setNodeRemark(e.target.value)}
                    placeholder="输入新备注..."
                    className="flex-1 bg-slate-700 text-white text-sm rounded px-3 py-2 border border-slate-600 focus:border-cyan-500 outline-none"
                  />
                  <button
                    onClick={handleUpdateRemark}
                    disabled={!nodeRemark.trim()}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white px-3 rounded transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedMember && (
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-white font-semibold mb-3">杆件属性</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">类型:</span>
                  <span className="text-cyan-400">
                    {selectedMember.type === 'beam' ? '横梁' : selectedMember.type === 'damper' ? '阻尼器' : '弹簧'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">连接:</span>
                  <span className="text-white font-mono">{selectedMember.startNodeId} → {selectedMember.endNodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">应力:</span>
                  <span className={`font-mono ${
                    selectedMember.currentStress > selectedMember.maxStress ? 'text-red-400' :
                    selectedMember.currentStress > selectedMember.maxStress * 0.7 ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {selectedMember.currentStress.toFixed(1)} / {selectedMember.maxStress}
                  </span>
                </div>
                <button
                  onClick={() => removeMember(selectedMember.id)}
                  className="w-full mt-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-2 rounded font-medium flex items-center justify-center gap-2 transition-colors border border-red-600/50"
                >
                  <Trash2 size={16} />
                  移除杆件 (退还50%)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
