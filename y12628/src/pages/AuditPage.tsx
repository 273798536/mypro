import { useState } from 'react';
import { History, Undo, Redo, Search, ChevronDown, ChevronRight, Clock, User, GitBranch, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import type { TraceChain } from '../types';

const AuditPage = () => {
  const { stickers, history, undo, redo, canUndo, canRedo, getTraceChain } = useAppStore();
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const allActions = history.undoStack.flat().reverse();
  
  const filteredActions = allActions.filter(action =>
    action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAction = (id: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedSticker = stickers.find(s => s.id === selectedStickerId);
  const traceChain: TraceChain | null = selectedStickerId ? getTraceChain(selectedStickerId) : null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create': return <span className="text-success">+</span>;
      case 'delete': return <span className="text-danger">−</span>;
      case 'move': return <span className="text-primary">↔</span>;
      case 'flip': return <span className="text-warning">⟲</span>;
      case 'import': return <span className="text-purple-400">↓</span>;
      default: return <span>•</span>;
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'create': return '创建';
      case 'delete': return '删除';
      case 'move': return '移动';
      case 'flip': return '翻转';
      case 'import': return '导入';
      default: return type;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">审计追溯</h2>
            <p className="text-sm text-white/60 mt-1">查看操作历史并追溯数据来源</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Undo className="w-4 h-4" />
              撤销
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Redo className="w-4 h-4" />
              重做
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="搜索操作记录..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
          {filteredActions.map((action) => (
            <div
              key={action.id}
              className="glass-card glass-card-hover overflow-hidden cursor-pointer"
              onClick={() => toggleAction(action.id)}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  {getActionIcon(action.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{action.description}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      {getActionTypeLabel(action.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(action.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {action.operator}
                    </span>
                  </div>
                </div>
                
                {expandedActions.has(action.id) ? (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/40" />
                )}
              </div>
              
              {expandedActions.has(action.id) && (
                <div className="px-4 pb-4 border-t border-white/10">
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/50 mb-1">变更前</p>
                      <pre className="text-xs bg-white/5 p-2 rounded text-white/70 overflow-auto max-h-32">
                        {JSON.stringify(action.before, null, 2) || '无'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-1">变更后</p>
                      <pre className="text-xs bg-white/5 p-2 rounded text-white/70 overflow-auto max-h-32">
                        {JSON.stringify(action.after, null, 2) || '无'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredActions.length === 0 && (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <p className="text-white/40">暂无操作记录</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-white/80 mb-3">撤销重做栈状态</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${canUndo() ? 'bg-success' : 'bg-white/20'}`} />
              <span className="text-sm text-white/70">可撤销: {history.undoStack.length} 步</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${canRedo() ? 'bg-success' : 'bg-white/20'}`} />
              <span className="text-sm text-white/70">可重做: {history.redoStack.length} 步</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">贴纸追溯链</h3>
        
        <div className="mb-4 max-h-48 overflow-y-auto scrollbar-thin space-y-1">
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => setSelectedStickerId(sticker.id)}
              className={`w-full text-left p-2 rounded-lg transition-all flex items-center gap-2 ${
                selectedStickerId === sticker.id
                  ? 'bg-primary/20 border border-primary/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <div
                className="w-5 h-5 rounded flex-shrink-0"
                style={{ backgroundColor: sticker.color }}
              />
              <span className="text-sm text-white truncate">{sticker.label}</span>
            </button>
          ))}
          {stickers.length === 0 && (
            <p className="text-sm text-white/40 text-center py-4">暂无贴纸</p>
          )}
        </div>

        {traceChain && selectedSticker && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white">处理追溯链</span>
            </div>
            
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-px bg-white/20" />
              
              {traceChain.steps.map((step) => (
                <div key={step.actionId} className="relative pl-10 pb-4">
                  <div className="absolute left-2 top-0 w-5 h-5 rounded-full bg-primary border-2 border-slate-900 flex items-center justify-center">
                    <ArrowLeft className="w-3 h-3 text-white rotate-180" />
                  </div>
                  
                  <div className="glass-card p-3">
                    <p className="text-sm text-white">{step.description}</p>
                    <p className="text-xs text-white/50 mt-1">{formatTime(step.timestamp)}</p>
                    
                    {step.details && Object.keys(step.details).length > 0 && (
                      <div className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60">
                        {Object.entries(step.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-white/40">{key}: </span>
                            {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-xs text-success font-medium mb-1">来源数据</p>
              <pre className="text-xs text-white/60 overflow-auto max-h-24">
                {JSON.stringify(traceChain.sourceData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!traceChain && selectedStickerId && (
          <div className="border-t border-white/10 pt-4 text-center">
            <p className="text-sm text-white/40">未找到该贴纸的追溯链</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPage;
