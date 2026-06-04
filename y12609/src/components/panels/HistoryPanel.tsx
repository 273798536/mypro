import { Clock, Plus, Trash2, Edit3, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function HistoryPanel() {
  const { history, historyIndex } = useStore();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus size={12} />;
      case 'delete': return <Trash2 size={12} />;
      case 'modify': return <Edit3 size={12} />;
      case 'rule_change': return <Settings size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'add': return 'text-green-600 bg-green-50 border-green-200';
      case 'delete': return 'text-red-600 bg-red-50 border-red-200';
      case 'modify': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'rule_change': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-mono text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
          <Clock size={16} />
          操作历史
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center">
            <Clock size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs text-slate-400 font-mono">暂无操作记录</p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">开始标注后将显示历史</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="p-3 space-y-1">
              {history.map((node, index) => {
                const isActive = index === historyIndex;
                const isPast = index < historyIndex;

                return (
                  <div
                    key={node.id}
                    className={`relative pl-10 pr-3 py-2 rounded transition-all ${
                      isActive
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : isPast
                          ? 'opacity-60'
                          : 'opacity-40'
                    }`}
                  >
                    <div
                      className={`absolute left-3 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${getTypeColor(node.type)}`}
                    >
                      {getTypeIcon(node.type)}
                    </div>

                    <div className="text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                          #{index + 1}
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-0.5">{node.description}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(node.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        标注数: {node.before.length} → {node.after.length}
                      </p>
                    </div>
                  </div>
                );
              }).reverse()}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="text-[10px] text-slate-500 font-mono space-y-1">
          <p className="font-bold text-slate-600">图例说明:</p>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
              <Plus size={10} className="text-green-600" />
            </span>
            <span>添加标注</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-100 border border-red-300 flex items-center justify-center">
              <Trash2 size={10} className="text-red-600" />
            </span>
            <span>删除标注</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-100 border border-blue-300 flex items-center justify-center">
              <Edit3 size={10} className="text-blue-600" />
            </span>
            <span>修改备注</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-purple-100 border border-purple-300 flex items-center justify-center">
              <Settings size={10} className="text-purple-600" />
            </span>
            <span>规则变更</span>
          </div>
        </div>
      </div>
    </div>
  );
}
