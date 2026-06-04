import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Palette, Plus, Trash2, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ColorRule } from '@/types';

export default function Rules() {
  const { colorRules, updateColorRules, annotations, getCurrentSample } = useStore();
  const [editingRules, setEditingRules] = useState<ColorRule[]>([...colorRules]);
  const [hasChanges, setHasChanges] = useState(false);

  const sample = getCurrentSample();
  const affectedCount = annotations.filter(a => !a.isValid).length;

  const updateRule = (id: string, field: keyof ColorRule, value: string | number) => {
    setEditingRules(prev =>
      prev.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
    setHasChanges(true);
  };

  const addNewRule = () => {
    const maxLevel = Math.max(...editingRules.map(r => r.level), 0);
    const newRule: ColorRule = {
      id: `temp-${Date.now()}`,
      level: maxLevel + 1,
      color: '#6B7280',
      label: `新等级${maxLevel + 1}`,
      minFrequency: 0,
      maxFrequency: 100,
      createdAt: Date.now()
    };
    setEditingRules([...editingRules, newRule].sort((a, b) => a.level - b.level));
    setHasChanges(true);
  };

  const deleteRule = (id: string) => {
    if (editingRules.length <= 1) return;
    setEditingRules(prev => prev.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const saveRules = () => {
    const finalRules = editingRules.map((rule, index) => ({
      ...rule,
      id: rule.id.startsWith('temp-') ? `cr-${Date.now()}-${index}` : rule.id
    }));
    updateColorRules(finalRules);
    setHasChanges(false);
  };

  const resetRules = () => {
    setEditingRules([...colorRules]);
    setHasChanges(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-mono text-2xl font-bold text-slate-800 mb-2">颜色规则配置</h1>
          <p className="text-sm text-slate-500 font-mono">
            配置热区等级对应的颜色和拣货频次范围。规则变更后，所有异常标注将自动重新校验并更新状态。
          </p>
        </div>

        {hasChanges && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-mono font-medium">
                规则已修改，保存后将联动更新 {annotations.length} 条标注的校验状态
              </p>
              {affectedCount > 0 && (
                <p className="text-xs text-amber-600 font-mono mt-1">
                  其中 {affectedCount} 条当前无效的标注可能会受影响
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetRules}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 font-mono"
              >
                <RefreshCw size={14} />
                重置
              </button>
              <button
                onClick={saveRules}
                className="flex items-center gap-1 px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-mono"
              >
                <Save size={14} />
                保存规则
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-slate-400" />
              <h2 className="font-mono font-bold text-slate-700">热区等级定义</h2>
            </div>
            <button
              onClick={addNewRule}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border-2 border-dashed border-slate-300 rounded hover:border-blue-400 hover:text-blue-600 font-mono transition-colors"
            >
              <Plus size={14} />
              添加等级
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {editingRules.map(rule => (
              <div key={rule.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">等级</label>
                    <input
                      type="number"
                      value={rule.level}
                      onChange={(e) => updateRule(rule.id, 'level', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded font-mono text-center"
                      min="1"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">颜色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={rule.color}
                        onChange={(e) => updateRule(rule.id, 'color', e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer border border-slate-300"
                      />
                      <input
                        type="text"
                        value={rule.color}
                        onChange={(e) => updateRule(rule.id, 'color', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">标签</label>
                    <input
                      type="text"
                      value={rule.label}
                      onChange={(e) => updateRule(rule.id, 'label', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">最小频次</label>
                    <input
                      type="number"
                      value={rule.minFrequency}
                      onChange={(e) => updateRule(rule.id, 'minFrequency', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded font-mono"
                      min="0"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">最大频次</label>
                    <input
                      type="number"
                      value={rule.maxFrequency}
                      onChange={(e) => updateRule(rule.id, 'maxFrequency', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded font-mono"
                      min="0"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">预览</label>
                    <div
                      className="h-8 rounded border-2 border-slate-300 flex items-center justify-center"
                      style={{ backgroundColor: rule.color }}
                    >
                      <span className="text-white text-xs font-mono font-bold drop-shadow">
                        {rule.label}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">操作</label>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      disabled={editingRules.length <= 1}
                      className="w-full p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="删除规则"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-mono font-bold text-blue-800 mb-2">规则联动说明</h3>
            <ul className="text-[11px] text-blue-700 font-mono space-y-1">
              <li>• 保存规则后，系统自动重新校验所有标注</li>
              <li>• 标注颜色会根据等级自动更新为对应颜色</li>
              <li>• 规则变更会记录到操作历史，支持撤销重做</li>
              <li>• 被判定为无效的标注会在报告中高亮显示</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-mono font-bold text-slate-700 mb-2">当前样例信息</h3>
            {sample ? (
              <div className="text-[11px] text-slate-600 font-mono space-y-1">
                <p>• 样例: {sample.name}</p>
                <p>• 货架数: {sample.warehouseLayout.length}</p>
                <p>• 标注数: {annotations.length}</p>
                <p>• 无效标注: {annotations.filter(a => !a.isValid).length}</p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 font-mono">未选择样例</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
