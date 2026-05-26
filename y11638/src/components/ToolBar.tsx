import { useGameStore } from '../store/useGameStore';
import { MousePointer2, Plus, Link2, Play, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ToolBar() {
  const navigate = useNavigate();
  const {
    toolMode,
    setToolMode,
    isSimulating,
    startSimulation,
    resetLevel,
    currentLevel,
    members,
    totalCost
  } = useGameStore();
  
  const tools = [
    { id: 'select', icon: MousePointer2, label: '选择移动' },
    { id: 'add_node', icon: Plus, label: '添加节点' },
    { id: 'connect', icon: Link2, label: '连接杆件' },
  ] as const;
  
  const canStartSimulation = members.length > 0 && totalCost <= (currentLevel?.budget || 0);
  
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">工具栏</h3>
        <button
          onClick={() => {
            navigate('/');
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
          title="返回主菜单"
        >
          <Home size={18} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => !isSimulating && setToolMode(tool.id)}
              disabled={isSimulating}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                toolMode === tool.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <tool.icon size={20} />
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>
        
        <div className="pt-3 border-t border-slate-700 space-y-2">
          <button
            onClick={startSimulation}
            disabled={!canStartSimulation || isSimulating}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              canStartSimulation && !isSimulating
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg shadow-green-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play size={20} />
            {isSimulating ? '模拟中...' : '开始测试'}
          </button>
          
          {!canStartSimulation && !isSimulating && (
            <div className="text-xs text-red-400 text-center">
              {members.length === 0 ? '请先搭建桥梁结构' : '预算超支，无法开始测试'}
            </div>
          )}
          
          <button
            onClick={resetLevel}
            disabled={isSimulating}
            className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              !isSimulating
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
        <div className="text-xs text-slate-400 space-y-1">
          <div><span className="text-slate-300">左键</span>：选择/连接节点</div>
          <div><span className="text-slate-300">右键</span>：删除节点/杆件</div>
          <div><span className="text-slate-300">拖拽</span>：移动节点</div>
        </div>
      </div>
    </div>
  );
}
