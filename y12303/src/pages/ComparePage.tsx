import { useState, useEffect } from 'react';
import { GitCompare, Save, RotateCcw, ArrowLeftRight, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CrackPoint, CrackStatus, RiskLevel } from '../types';
import { compareCracks } from '../utils/historyManager';

export function ComparePage() {
  const editingCrack = useAppStore((state) => state.editingCrack);
  const cracks = useAppStore((state) => state.cracks);
  const updateCrack = useAppStore((state) => state.updateCrack);
  const setEditingCrack = useAppStore((state) => state.setEditingCrack);

  const [formData, setFormData] = useState<Partial<CrackPoint>>({});
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (editingCrack) {
      setFormData(editingCrack);
      setSelectedId(editingCrack.id);
    } else if (cracks.length > 0) {
      setSelectedId(cracks[0].id);
      setFormData(cracks[0]);
    }
  }, [editingCrack, cracks]);

  const originalCrack = cracks.find((c) => c.id === selectedId);
  const changes = originalCrack && formData ? compareCracks(originalCrack, formData as CrackPoint) : [];

  const handleSelectCrack = (id: string) => {
    const crack = cracks.find((c) => c.id === id);
    if (crack) {
      setSelectedId(id);
      setFormData(crack);
    }
  };

  const handleInputChange = (field: keyof CrackPoint, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (formData && originalCrack) {
      updateCrack(formData as CrackPoint, '地质工程师');
      alert('保存成功！修改已记录到历史。');
    }
  };

  const handleReset = () => {
    if (originalCrack) {
      setFormData(originalCrack);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      normal: '正常',
      duplicate: '重复',
      missing_field: '缺字段',
      late_added: '晚补',
    };
    return labels[status] || status;
  };

  if (!originalCrack) {
    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="p-8 text-center">
          <p className="text-slate-500">暂无数据可编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <GitCompare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">修正对比</h2>
              <p className="text-xs text-slate-500">手动修正裂缝数据，对比新旧结果</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={handleSave}
              disabled={changes.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
              保存修改
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto">
            <div className="p-3">
              <label className="text-xs text-slate-500 mb-2 block">选择裂缝</label>
              <select
                value={selectedId}
                onChange={(e) => handleSelectCrack(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {cracks.map((crack) => (
                  <option key={crack.id} value={crack.id}>
                    {crack.name}
                    {crack.isDuplicate && ' (重复)'}
                  </option>
                ))}
              </select>
            </div>

            {changes.length > 0 && (
              <div className="px-3 pb-3">
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3" />
                    变更预览
                  </h4>
                  <div className="space-y-1">
                    {changes.map((change, index) => (
                      <div key={index} className="text-xs">
                        <span className="text-slate-500">{change.field}:</span>
                        <span className="text-slate-400 line-through ml-1">{change.oldValue}</span>
                        <span className="text-status-normal ml-1">→ {change.newValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex">
            <div className="flex-1 border-r border-slate-800 flex flex-col">
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                <span className="text-sm text-slate-400">原始数据</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">裂缝名称</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300">
                      {originalCrack.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">坐标 X</label>
                      <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300 font-mono">
                        {originalCrack.x}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">坐标 Y</label>
                      <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300 font-mono">
                        {originalCrack.y}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">高程 Z</label>
                      <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300 font-mono">
                        {originalCrack.z}m
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">长度</label>
                      <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300 font-mono">
                        {originalCrack.length}m
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">状态</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm">
                      <span
                        className={`status-badge ${
                          originalCrack.status === 'normal'
                            ? 'status-normal'
                            : originalCrack.status === 'duplicate'
                              ? 'status-duplicate'
                              : 'status-missing'
                        }`}
                      >
                        {getStatusLabel(originalCrack.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">风险等级</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm">
                      <span
                        className={
                          originalCrack.riskLevel === 'high'
                            ? 'text-status-duplicate'
                            : originalCrack.riskLevel === 'medium'
                              ? 'text-status-missing'
                              : 'text-status-normal'
                        }
                      >
                        {originalCrack.riskLevel === 'high'
                          ? '高风险'
                          : originalCrack.riskLevel === 'medium'
                            ? '中风险'
                            : '低风险'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">雨量数据</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm">
                      {originalCrack.rainfall ? (
                        <span className="text-slate-300">{originalCrack.rainfall}</span>
                      ) : (
                        <span className="text-status-missing">缺失</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">住户坐标</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm">
                      {originalCrack.residentCoords ? (
                        <span className="text-slate-300 font-mono">{originalCrack.residentCoords}</span>
                      ) : (
                        <span className="text-status-missing">缺失</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">备注</label>
                    <div className="px-3 py-2 bg-slate-800/50 rounded-md text-sm text-slate-300">
                      {originalCrack.remark}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-blue-600/10 border-b border-blue-500/30">
                <span className="text-sm text-blue-400">编辑数据</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">裂缝名称</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">坐标 X</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.x || 0}
                        onChange={(e) => handleInputChange('x', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">坐标 Y</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.y || 0}
                        onChange={(e) => handleInputChange('y', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">高程 Z</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.z || 0}
                        onChange={(e) => handleInputChange('z', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">长度</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.length || 0}
                        onChange={(e) => handleInputChange('length', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">状态</label>
                    <select
                      value={formData.status || 'normal'}
                      onChange={(e) => handleInputChange('status', e.target.value as CrackStatus)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="normal">正常</option>
                      <option value="duplicate">重复</option>
                      <option value="missing_field">缺字段</option>
                      <option value="late_added">晚补</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">风险等级</label>
                    <select
                      value={formData.riskLevel || 'low'}
                      onChange={(e) => handleInputChange('riskLevel', e.target.value as RiskLevel)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="low">低风险</option>
                      <option value="medium">中风险</option>
                      <option value="high">高风险</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">雨量数据</label>
                    <input
                      type="text"
                      placeholder="例如: 45.2mm"
                      value={formData.rainfall || ''}
                      onChange={(e) => handleInputChange('rainfall', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">住户坐标</label>
                    <input
                      type="text"
                      placeholder="例如: 116.397,39.908"
                      value={formData.residentCoords || ''}
                      onChange={(e) => handleInputChange('residentCoords', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">备注</label>
                    <textarea
                      rows={3}
                      value={formData.remark || ''}
                      onChange={(e) => handleInputChange('remark', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span>创建时间: {originalCrack.createTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
