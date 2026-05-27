import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { useThermoStore } from '../../hooks/useThermoStore';
import { GAS_CONSTANT } from '../../types';

export default function StatePointForm() {
  const { statePoints, selectedPointId, addStatePoint, updateStatePoint, deleteStatePoint, setSelectedPoint, substanceAmount } = useThermoStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    P: 1e5,
    V: 0.01,
    T: 300,
    source: '',
  });

  const handleAdd = () => {
    setIsAdding(true);
    const nextLabel = String.fromCharCode(65 + statePoints.length);
    setFormData({
      label: statePoints.length < 26 ? nextLabel : `P${statePoints.length + 1}`,
      P: 1e5,
      V: 0.01,
      T: 300,
      source: '',
    });
  };

  const handleSaveNew = () => {
    if (!formData.label.trim()) return;
    addStatePoint(formData, formData.source || '手动输入');
    setIsAdding(false);
  };

  const handleEdit = (point: typeof statePoints[0]) => {
    setEditingId(point.id);
    setFormData({
      label: point.label,
      P: point.P,
      V: point.V,
      T: point.T,
      source: point.source || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    updateStatePoint(id, formData, formData.source || '手动修改');
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const calculateTFromPV = (P: number, V: number) => {
    return (P * V) / (substanceAmount * GAS_CONSTANT);
  };

  const handleAutoCalculateT = () => {
    const calculatedT = calculateTFromPV(formData.P, formData.V);
    setFormData(prev => ({ ...prev, T: Number(calculatedT.toFixed(2)) }));
  };

  const selectedPoint = statePoints.find(p => p.id === selectedPointId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">状态点</h3>
        {!isAdding && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            添加
          </button>
        )}
      </div>

      {selectedPoint && (
        <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300 mb-2">选中：{selectedPoint.label}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-slate-400">P: {selectedPoint.P.toExponential(2)} Pa</div>
            <div className="text-slate-400">V: {selectedPoint.V.toExponential(2)} m³</div>
            <div className="text-slate-400">T: {selectedPoint.T.toFixed(1)} K</div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
          <h4 className="text-sm font-medium text-slate-200">新建状态点</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">标签</label>
              <input
                type="text"
                value={formData.label}
                onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">来源</label>
              <input
                type="text"
                value={formData.source}
                onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="如：习题3.2"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">压强 P (Pa)</label>
              <input
                type="number"
                value={formData.P}
                onChange={e => setFormData(prev => ({ ...prev, P: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                step="1000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">体积 V (m³)</label>
              <input
                type="number"
                value={formData.V}
                onChange={e => setFormData(prev => ({ ...prev, V: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                step="0.001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">温度 T (K)</label>
              <input
                type="number"
                value={formData.T}
                onChange={e => setFormData(prev => ({ ...prev, T: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                step="0.1"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAutoCalculateT}
                className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-xs text-slate-200 rounded transition-colors"
              >
                由PV计算T
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveNew}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
            >
              <Check size={16} />
              保存
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {statePoints.map(point => {
          const isEditing = editingId === point.id;
          const hasAnomaly = useThermoStore.getState().anomalies.some(
            a => a.sourceRef.type === 'state_point' && a.sourceRef.id === point.id
          );

          if (isEditing) {
            return (
              <div key={point.id} className="p-3 bg-slate-800 rounded-lg border border-blue-500/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">标签</label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">来源</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">P (Pa)</label>
                    <input
                      type="number"
                      value={formData.P}
                      onChange={e => setFormData(prev => ({ ...prev, P: Number(e.target.value) }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">V (m³)</label>
                    <input
                      type="number"
                      value={formData.V}
                      onChange={e => setFormData(prev => ({ ...prev, V: Number(e.target.value) }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      step="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">T (K)</label>
                    <input
                      type="number"
                      value={formData.T}
                      onChange={e => setFormData(prev => ({ ...prev, T: Number(e.target.value) }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(point.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                  >
                    <Check size={14} />
                    保存
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                  >
                    <X size={14} />
                    取消
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={point.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedPointId === point.id
                  ? 'bg-blue-900/30 border-blue-500/50'
                  : hasAnomaly
                    ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              }`}
              onClick={() => setSelectedPoint(point.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-slate-100">{point.label}</span>
                <div className="flex items-center gap-1">
                  {hasAnomaly && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">异常</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(point); }}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteStatePoint(point.id, '手动删除'); }}
                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="text-slate-400">P: {point.P.toExponential(2)}</div>
                <div className="text-slate-400">V: {point.V.toExponential(2)}</div>
                <div className="text-slate-400">T: {point.T.toFixed(1)}</div>
              </div>
              {point.source && (
                <div className="mt-1 text-xs text-slate-500">来源: {point.source}</div>
              )}
            </div>
          );
        })}
      </div>

      {statePoints.length === 0 && !isAdding && (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>暂无状态点</p>
          <p className="text-xs mt-1">点击"添加"创建第一个状态点</p>
        </div>
      )}
    </div>
  );
}
