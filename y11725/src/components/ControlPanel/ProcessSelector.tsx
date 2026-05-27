import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, ArrowRight } from 'lucide-react';
import { useThermoStore } from '../../hooks/useThermoStore';
import { PROCESS_LABELS, PROCESS_COLORS, type ProcessType } from '../../types';

export default function ProcessSelector() {
  const { statePoints, processes, selectedProcessId, addProcess, updateProcess, deleteProcess, setSelectedProcess } = useThermoStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    type: 'isothermal' as ProcessType,
    gamma: 1.4,
    n: 1.3,
    source: '',
  });

  const processTypes: ProcessType[] = ['isothermal', 'isobaric', 'isochoric', 'adiabatic', 'polytropic'];

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      from: statePoints[0]?.id || '',
      to: statePoints[1]?.id || statePoints[0]?.id || '',
      type: 'isothermal',
      gamma: 1.4,
      n: 1.3,
      source: '',
    });
  };

  const handleSaveNew = () => {
    if (!formData.from || !formData.to || formData.from === formData.to) return;
    addProcess(formData, formData.source || '手动输入');
    setIsAdding(false);
  };

  const handleEdit = (process: typeof processes[0]) => {
    setEditingId(process.id);
    setFormData({
      from: process.from,
      to: process.to,
      type: process.type,
      gamma: process.gamma || 1.4,
      n: process.n || 1.3,
      source: process.source || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    updateProcess(id, formData, formData.source || '手动修改');
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const getPointLabel = (id: string) => statePoints.find(p => p.id === id)?.label || '?';

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">过程</h3>
        {!isAdding && statePoints.length >= 2 && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            添加
          </button>
        )}
      </div>

      {statePoints.length < 2 && (
        <div className="text-center py-4 text-slate-500 text-sm bg-slate-800/50 rounded-lg">
          <p>至少需要2个状态点才能创建过程</p>
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
          <h4 className="text-sm font-medium text-slate-200">新建过程</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">起点</label>
              <select
                value={formData.from}
                onChange={e => setFormData(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {statePoints.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">终点</label>
              <select
                value={formData.to}
                onChange={e => setFormData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {statePoints.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">过程类型</label>
              <div className="grid grid-cols-5 gap-1">
                {processTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                    className={`px-2 py-2 text-xs rounded transition-colors ${
                      formData.type === type
                        ? 'text-white font-medium'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                    style={formData.type === type ? { backgroundColor: PROCESS_COLORS[type] } : {}}
                  >
                    {PROCESS_LABELS[type].charAt(0)}
                  </button>
                ))}
              </div>
            </div>
            {(formData.type === 'adiabatic' || formData.type === 'polytropic') && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {formData.type === 'adiabatic' ? '绝热指数 γ' : '多方指数 n'}
                </label>
                <input
                  type="number"
                  value={formData.type === 'adiabatic' ? formData.gamma : formData.n}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    [formData.type === 'adiabatic' ? 'gamma' : 'n']: Number(e.target.value),
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  step="0.1"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">来源</label>
              <input
                type="text"
                value={formData.source}
                onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="如：教材P123"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveNew}
              disabled={formData.from === formData.to}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
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

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {processes.map(process => {
          const isEditing = editingId === process.id;
          const hasAnomaly = useThermoStore.getState().anomalies.some(
            a => a.sourceRef.type === 'process' && a.sourceRef.id === process.id
          );
          const fromLabel = getPointLabel(process.from);
          const toLabel = getPointLabel(process.to);

          if (isEditing) {
            return (
              <div key={process.id} className="p-3 bg-slate-800 rounded-lg border border-emerald-500/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">起点</label>
                    <select
                      value={formData.from}
                      onChange={e => setFormData(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {statePoints.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">终点</label>
                    <select
                      value={formData.to}
                      onChange={e => setFormData(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {statePoints.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">过程类型</label>
                    <div className="grid grid-cols-5 gap-1">
                      {processTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setFormData(prev => ({ ...prev, type }))}
                          className={`px-2 py-1.5 text-xs rounded ${
                            formData.type === type
                              ? 'text-white font-medium'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                          style={formData.type === type ? { backgroundColor: PROCESS_COLORS[type] } : {}}
                        >
                          {PROCESS_LABELS[type].charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(process.id)}
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
              key={process.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedProcessId === process.id
                  ? 'bg-emerald-900/30 border-emerald-500/50'
                  : hasAnomaly
                    ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              }`}
              onClick={() => setSelectedProcess(process.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PROCESS_COLORS[process.type] }}
                  />
                  <span className="font-mono text-slate-100 text-sm">
                    {fromLabel} <ArrowRight size={14} className="inline" /> {toLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {hasAnomaly && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">异常</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(process); }}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteProcess(process.id, '手动删除'); }}
                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">{PROCESS_LABELS[process.type]}</span>
                <span className="font-mono text-slate-500">W: {process.W.toFixed(0)} J</span>
                <span className="font-mono text-slate-500">Q: {process.Q.toFixed(0)} J</span>
              </div>
              {process.source && (
                <div className="mt-1 text-xs text-slate-500">来源: {process.source}</div>
              )}
            </div>
          );
        })}
      </div>

      {processes.length === 0 && !isAdding && statePoints.length >= 2 && (
        <div className="text-center py-6 text-slate-500 text-sm bg-slate-800/50 rounded-lg">
          <p>暂无过程</p>
          <p className="text-xs mt-1">点击"添加"创建第一个过程</p>
        </div>
      )}
    </div>
  );
}
