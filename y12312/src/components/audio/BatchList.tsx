import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BATCH_STATUS_LABELS, Batch } from '../../types';
import { Plus, FolderOpen, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';

export const BatchList: React.FC = () => {
  const { batches, activeBatchId, setActiveBatch, createNewBatch, problems } = useAppStore();
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newSourceNote, setNewSourceNote] = useState('');
  const [newListenerNote, setNewListenerNote] = useState('');

  const handleCreateBatch = () => {
    if (!newBatchName.trim()) return;
    createNewBatch(newBatchName, newSourceNote, newListenerNote);
    setNewBatchName('');
    setNewSourceNote('');
    setNewListenerNote('');
    setShowNewBatch(false);
  };

  const getStatusIcon = (status: Batch['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'has_issues':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'analyzing':
        return <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />;
      case 'pending':
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getProblemCount = (batchId: string) => {
    return problems[batchId]?.length || 0;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-spectrum-cyan" />
            <span className="font-display font-semibold text-sm text-slate-200">分析批次</span>
          </div>
          <button
            onClick={() => setShowNewBatch(!showNewBatch)}
            className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {showNewBatch && (
          <div className="space-y-2 p-2 bg-surface-lighter/50 rounded-lg border border-slate-600/30 mb-2">
            <input
              type="text"
              placeholder="批次名称..."
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-surface/50 border border-slate-600/30 rounded focus:outline-none focus:border-spectrum-cyan/50"
            />
            <input
              type="text"
              placeholder="来源备注..."
              value={newSourceNote}
              onChange={(e) => setNewSourceNote(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-surface/50 border border-slate-600/30 rounded focus:outline-none focus:border-spectrum-cyan/50"
            />
            <input
              type="text"
              placeholder="听感备注..."
              value={newListenerNote}
              onChange={(e) => setNewListenerNote(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-surface/50 border border-slate-600/30 rounded focus:outline-none focus:border-spectrum-cyan/50"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateBatch}
                className="flex-1 btn-spectrum text-xs py-1"
              >
                创建
              </button>
              <button
                onClick={() => setShowNewBatch(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {batches.map((batch) => {
          const problemCount = getProblemCount(batch.batchId);
          const isActive = activeBatchId === batch.batchId;
          
          return (
            <button
              key={batch.batchId}
              onClick={() => setActiveBatch(batch.batchId)}
              className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-spectrum-gradient-soft border border-spectrum-cyan/30 shadow-inner-glow'
                  : 'bg-surface-lighter/20 border border-transparent hover:bg-surface-lighter/40 hover:border-slate-600/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(batch.status)}
                    <span className="font-medium text-sm text-slate-200 truncate">
                      {batch.name}
                    </span>
                  </div>
                  
                  {batch.sourceNote && (
                    <div className="mt-1 text-[10px] text-slate-500 truncate">
                      {batch.sourceNote}
                    </div>
                  )}
                  
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{formatDate(batch.createdAt)}</span>
                    <span className="spectrum-badge">
                      {BATCH_STATUS_LABELS[batch.status]}
                    </span>
                  </div>
                </div>
                
                {problemCount > 0 && (
                  <div className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    problemCount > 2 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {problemCount} 问题
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-700/30">
        <div className="text-[10px] text-slate-500 text-center">
          共 {batches.length} 个批次
        </div>
      </div>
    </div>
  );
};
