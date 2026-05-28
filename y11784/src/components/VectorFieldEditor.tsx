import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Check, X, BookOpen } from 'lucide-react';
import { usePathStore } from '@/store/pathStore';
import { useRevisionStore } from '@/store/revisionStore';
import { PRESET_VECTOR_FIELDS } from '@/shared/constants';
import { validateExpression } from '@/utils/math/expressionParser';
import { cn } from '@/lib/utils';

export function VectorFieldEditor() {
  const { vectorFields, activeVectorFieldId, updateVectorField, setActiveVectorField, addVectorField } = usePathStore();
  const { addEntry } = useRevisionStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [localExpressions, setLocalExpressions] = useState<{ x: string; y: string } | null>(null);

  const activeVf = vectorFields.find((vf) => vf.id === activeVectorFieldId);

  const handleExpressionChange = (field: 'x' | 'y', value: string) => {
    if (!activeVf) return;
    setLocalExpressions({
      x: field === 'x' ? value : localExpressions?.x ?? activeVf.expressionX,
      y: field === 'y' ? value : localExpressions?.y ?? activeVf.expressionY,
    });
  };

  const handleApplyExpressions = () => {
    if (!activeVf || !localExpressions) return;

    const isValidX = validateExpression(localExpressions.x);
    const isValidY = validateExpression(localExpressions.y);

    if (!isValidX || !isValidY) return;

    const prevVf = { ...activeVf };
    updateVectorField(activeVf.id, {
      expressionX: localExpressions.x,
      expressionY: localExpressions.y,
    });

    addEntry({
      targetType: 'vectorField',
      targetId: activeVf.id,
      action: 'update',
      previousValue: { expressionX: prevVf.expressionX, expressionY: prevVf.expressionY },
      newValue: { expressionX: localExpressions.x, expressionY: localExpressions.y },
      source: '手动编辑',
      correctionNote: '更新向量场表达式',
    });

    setLocalExpressions(null);
  };

  const handleCancelEdit = () => {
    setLocalExpressions(null);
  };

  const handleSelectPreset = (preset: (typeof PRESET_VECTOR_FIELDS)[0]) => {
    const newVf = addVectorField({
      name: preset.name,
      expressionX: preset.expressionX,
      expressionY: preset.expressionY,
      source: preset.description,
      range: { ...preset.range },
    });

    setActiveVectorField(newVf.id);
    setShowPresets(false);

    addEntry({
      targetType: 'vectorField',
      targetId: newVf.id,
      action: 'create',
      previousValue: null,
      newValue: newVf,
      source: '预设模板',
      correctionNote: `从预设添加向量场: ${preset.name}`,
    });
  };

  const handleRangeChange = (axis: 'minX' | 'maxX' | 'minY' | 'maxY', value: number) => {
    if (!activeVf) return;

    const prevRange = { ...activeVf.range };
    const newRange = { ...activeVf.range, [axis]: value };

    updateVectorField(activeVf.id, { range: newRange });

    addEntry({
      targetType: 'vectorField',
      targetId: activeVf.id,
      action: 'update',
      previousValue: { range: prevRange },
      newValue: { range: newRange },
      source: '手动编辑',
      correctionNote: `调整范围: ${axis}`,
    });
  };

  if (!activeVf) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <p className="text-slate-500 text-sm">暂无向量场数据</p>
      </div>
    );
  }

  const displayX = localExpressions?.x ?? activeVf.expressionX;
  const displayY = localExpressions?.y ?? activeVf.expressionY;
  const isValidX = validateExpression(displayX);
  const isValidY = validateExpression(displayY);
  const hasChanges = localExpressions !== null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">向量场配置</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              当前向量场
            </label>
            <select
              value={activeVectorFieldId || ''}
              onChange={(e) => setActiveVectorField(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {vectorFields.map((vf) => (
                <option key={vf.id} value={vf.id}>
                  {vf.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
            >
              <BookOpen className="w-4 h-4" />
              预设模板
            </button>
          </div>

          {showPresets && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-md">
              {PRESET_VECTOR_FIELDS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2 hover:bg-white rounded-md transition-colors"
                >
                  <div className="font-medium text-sm text-slate-800">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              X 分量 Fₓ(x, y)
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayX}
                onChange={(e) => handleExpressionChange('x', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500',
                  isValidX ? 'border-slate-300' : 'border-red-400'
                )}
                placeholder="例如: x + y"
              />
              {!isValidX && (
                <X className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Y 分量 Fᵧ(x, y)
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayY}
                onChange={(e) => handleExpressionChange('y', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500',
                  isValidY ? 'border-slate-300' : 'border-red-400'
                )}
                placeholder="例如: x - y"
              />
              {!isValidY && (
                <X className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleApplyExpressions}
                disabled={!isValidX || !isValidY}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                应用
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-2 border border-slate-300 text-slate-600 text-sm rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">X 最小值</label>
              <input
                type="number"
                value={activeVf.range.minX}
                onChange={(e) => handleRangeChange('minX', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">X 最大值</label>
              <input
                type="number"
                value={activeVf.range.maxX}
                onChange={(e) => handleRangeChange('maxX', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Y 最小值</label>
              <input
                type="number"
                value={activeVf.range.minY}
                onChange={(e) => handleRangeChange('minY', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Y 最大值</label>
              <input
                type="number"
                value={activeVf.range.maxY}
                onChange={(e) => handleRangeChange('maxY', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>

          {activeVf.source && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              来源: {activeVf.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
