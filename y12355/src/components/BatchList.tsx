import { useState } from 'react';
import { useApp } from '../store';
import { Plus, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';

export const BatchList = () => {
  const { state, addBatch, deleteBatch, selectBatch, updateBatch } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAddBatch = () => {
    if (newName.trim()) {
      addBatch({
        name: newName.trim(),
        description: newDescription.trim()
      });
      setNewName('');
      setNewDescription('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (batch: { id: string; name: string; description: string }) => {
    setEditingId(batch.id);
    setEditName(batch.name);
    setEditDescription(batch.description);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      const batch = state.batches.find(b => b.id === editingId);
      if (batch) {
        updateBatch({
          ...batch,
          name: editName.trim(),
          description: editDescription.trim()
        });
      }
      setEditingId(null);
    }
  };

  const handleDeleteBatch = (id: string) => {
    if (confirm('删除批次将同时删除该批次下的所有记录，确定继续吗？')) {
      deleteBatch(id);
    }
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FolderOpen size={20} className="text-primary-600" />
          实验批次
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn btn-primary text-sm"
        >
          <Plus size={16} className="mr-1" />
          新建批次
        </button>
      </div>
      <div className="card-body space-y-2">
        {isAdding && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <input
              type="text"
              className="input mb-2"
              placeholder="批次名称，如：第一组 长摆"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="input mb-3"
              placeholder="批次描述（可选）"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewName('');
                  setNewDescription('');
                }}
                className="btn btn-secondary text-sm"
              >
                <X size={14} className="mr-1" />
                取消
              </button>
              <button
                onClick={handleAddBatch}
                className="btn btn-primary text-sm"
                disabled={!newName.trim()}
              >
                <Check size={14} className="mr-1" />
                创建
              </button>
            </div>
          </div>
        )}

        {state.batches.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>暂无批次</p>
            <p className="text-sm">点击上方"新建批次"开始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.batches.map(batch => {
              const recordCount = state.records.filter(r => r.batchId === batch.id).length;
              const anomalies = state.anomalies.filter(a => 
                state.records.some(r => r.batchId === batch.id && r.id === a.recordId)
              );
              const isSelected = state.selectedBatchId === batch.id;

              return (
                <div
                  key={batch.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => selectBatch(isSelected ? null : batch.id)}
                >
                  {editingId === batch.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="input mb-2"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="input mb-2"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(null);
                          }}
                          className="btn btn-secondary text-sm"
                        >
                          <X size={14} className="mr-1" />
                          取消
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="btn btn-primary text-sm"
                        >
                          <Check size={14} className="mr-1" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{batch.name}</span>
                          <span className="badge badge-info">{recordCount} 条记录</span>
                          {anomalies.length > 0 && (
                            <span className="badge badge-warning">
                              {anomalies.length} 项异常
                            </span>
                          )}
                        </div>
                        {batch.description && (
                          <p className="text-sm text-slate-500 mt-1">{batch.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          创建于 {new Date(batch.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEdit(batch)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
