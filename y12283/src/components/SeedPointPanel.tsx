import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Play, AlertTriangle, Clock, FileWarning, RefreshCw } from 'lucide-react';
import { SeedPoint, SeedPointStatus, Vector3 } from '../types';

interface SeedPointPanelProps {
  seeds: SeedPoint[];
  onAdd: (position: Vector3, status: SeedPointStatus, remark: string) => void;
  onUpdate: (id: string, updates: Partial<SeedPoint>, remark: string) => void;
  onDelete: (id: string, remark: string) => void;
  onCompute: (id: string) => void;
  onComputeAll: () => void;
  computingIds: Set<string>;
}

const statusConfig: Record<SeedPointStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  normal: { label: '正常', color: 'text-green-400', bgColor: 'bg-green-900/30', icon: null },
  missing_fields: { label: '缺字段', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', icon: <FileWarning size={12} /> },
  late_addition: { label: '晚补', color: 'text-orange-400', bgColor: 'bg-orange-900/30', icon: <Clock size={12} /> },
  modified: { label: '已修改', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30', icon: <RefreshCw size={12} /> },
};

const SeedPointPanel: React.FC<SeedPointPanelProps> = ({
  seeds,
  onAdd,
  onUpdate,
  onDelete,
  onCompute,
  onComputeAll,
  computingIds,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState({ x: 1, y: 1, z: 1 });
  const [newStatus, setNewStatus] = useState<SeedPointStatus>('normal');
  const [newRemark, setNewRemark] = useState('');
  const [deleteRemark, setDeleteRemark] = useState<Record<string, string>>({});
  const [updateRemark, setUpdateRemark] = useState<Record<string, string>>({});

  const handleAdd = () => {
    onAdd(newPosition, newStatus, newRemark);
    setIsAdding(false);
    setNewPosition({ x: 1, y: 1, z: 1 });
    setNewStatus('normal');
    setNewRemark('');
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 h-full flex flex-col border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          种子点管理
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onComputeAll}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-md transition-colors flex items-center gap-1"
          >
            <Play size={14} />
            全部计算
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            添加
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
          <h3 className="text-sm font-medium text-slate-300 mb-3">新增种子点</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-xs text-slate-400">X</label>
              <input
                type="number"
                step="0.1"
                value={newPosition.x}
                onChange={(e) => setNewPosition((p) => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Y</label>
              <input
                type="number"
                step="0.1"
                value={newPosition.y}
                onChange={(e) => setNewPosition((p) => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Z</label>
              <input
                type="number"
                step="0.1"
                value={newPosition.z}
                onChange={(e) => setNewPosition((p) => ({ ...p, z: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-400">状态标记</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as SeedPointStatus)}
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-400">备注</label>
            <input
              type="text"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="添加备注说明..."
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors"
            >
              确认添加
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {seeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <AlertTriangle size={32} className="mb-2 opacity-50" />
            <p className="text-sm">暂无种子点</p>
            <p className="text-xs">点击上方"添加"按钮创建</p>
          </div>
        ) : (
          seeds.map((seed) => (
            <div
              key={seed.id}
              className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              {editingId === seed.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={seed.position.x}
                      onChange={(e) => onUpdate(seed.id, { position: { ...seed.position, x: parseFloat(e.target.value) || 0 } }, updateRemark[seed.id] || '')}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={seed.position.y}
                      onChange={(e) => onUpdate(seed.id, { position: { ...seed.position, y: parseFloat(e.target.value) || 0 } }, updateRemark[seed.id] || '')}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={seed.position.z}
                      onChange={(e) => onUpdate(seed.id, { position: { ...seed.position, z: parseFloat(e.target.value) || 0 } }, updateRemark[seed.id] || '')}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="修改备注（留痕）..."
                    value={updateRemark[seed.id] || ''}
                    onChange={(e) => setUpdateRemark((prev) => ({ ...prev, [seed.id]: e.target.value }))}
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-500"
                  />
                  <button
                    onClick={() => setEditingId(null)}
                    className="w-full px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded"
                  >
                    完成编辑
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-cyan-300">
                        ({seed.position.x.toFixed(2)}, {seed.position.y.toFixed(2)}, {seed.position.z.toFixed(2)})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${statusConfig[seed.status].bgColor} ${statusConfig[seed.status].color}`}>
                        {statusConfig[seed.status].icon}
                        {statusConfig[seed.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onCompute(seed.id)}
                        disabled={computingIds.has(seed.id)}
                        className="p-1.5 text-cyan-400 hover:bg-cyan-900/30 rounded transition-colors disabled:opacity-50"
                        title="计算流线"
                      >
                        <Play size={14} className={computingIds.has(seed.id) ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => setEditingId(seed.id)}
                        className="p-1.5 text-yellow-400 hover:bg-yellow-900/30 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const remark = deleteRemark[seed.id];
                          if (remark !== undefined) {
                            onDelete(seed.id, remark);
                            setDeleteRemark((prev) => {
                              const next = { ...prev };
                              delete next[seed.id];
                              return next;
                            });
                          } else {
                            setDeleteRemark((prev) => ({ ...prev, [seed.id]: '' }));
                          }
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {deleteRemark[seed.id] !== undefined && (
                    <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded">
                      <p className="text-xs text-red-300 mb-1">删除备注（留痕）:</p>
                      <input
                        type="text"
                        value={deleteRemark[seed.id]}
                        onChange={(e) => setDeleteRemark((prev) => ({ ...prev, [seed.id]: e.target.value }))}
                        placeholder="填写删除原因..."
                        className="w-full px-2 py-1 bg-red-950/50 border border-red-700 rounded text-sm text-white placeholder-red-400"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            onDelete(seed.id, deleteRemark[seed.id]);
                            setDeleteRemark((prev) => {
                              const next = { ...prev };
                              delete next[seed.id];
                              return next;
                            });
                          }}
                          className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setDeleteRemark((prev) => {
                            const next = { ...prev };
                            delete next[seed.id];
                            return next;
                          })}
                          className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                  {seed.remark && (
                    <p className="text-xs text-slate-400 mt-1 italic">备注: {seed.remark}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    创建: {new Date(seed.createdAt).toLocaleString()}
                    {seed.modifiedAt.getTime() !== seed.createdAt.getTime() && (
                      <span className="ml-2">修改: {new Date(seed.modifiedAt).toLocaleString()}</span>
                    )}
                  </p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SeedPointPanel;
