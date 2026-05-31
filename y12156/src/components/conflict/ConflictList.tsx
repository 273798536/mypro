import { useState } from 'react';
import { AlertTriangle, Check, User, FileText, Clock, ArrowRight } from 'lucide-react';
import { DataConflict } from '../../types';
import { useCalculationStore } from '../../store/useCalculationStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, formatThickness, formatThermalConductivity } from '../../utils/formatters';
import { CONFLICT_TYPE_LABELS } from '../../utils/constants';

interface ConflictListProps {
  conflicts: DataConflict[];
  onResolve?: (conflictId: string, choice: 'construction' | 'material' | 'custom', customValue?: number | string) => void;
}

export default function ConflictList({ conflicts, onResolve }: ConflictListProps) {
  const { resolveDataConflict, autoResolveAllConflicts } = useCalculationStore();
  const [customValue, setCustomValue] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const resolvedConflicts = conflicts.filter(c => c.resolved);

  const formatValue = (value: number | string, type: string) => {
    if (typeof value !== 'number') return String(value);
    if (type === 'material_thickness') return formatThickness(value);
    if (type === 'thermal_conductivity') return formatThermalConductivity(value);
    return String(value);
  };

  const handleResolve = (conflictId: string, choice: 'construction' | 'material' | 'custom', customVal?: string) => {
    const resolveFn = onResolve || resolveDataConflict;
    if (choice === 'custom' && customVal !== undefined) {
      const numValue = parseFloat(customVal);
      resolveFn(conflictId, choice, isNaN(numValue) ? customVal : numValue);
    } else {
      resolveFn(conflictId, choice);
    }
    setShowCustomInput(prev => ({ ...prev, [conflictId]: false }));
    setCustomValue(prev => ({ ...prev, [conflictId]: '' }));
  };

  return (
    <div className="space-y-6">
      {conflicts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">数据匹配完美</h3>
          <p className="text-slate-500">构造数据与材料数据完全一致，未发现冲突</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">数据冲突列表</h3>
              <p className="text-sm text-slate-500 mt-1">
                共发现 <span className="font-medium text-amber-600">{conflicts.length}</span> 处冲突，
                待处理 <span className="font-medium text-red-600">{unresolvedConflicts.length}</span> 处
              </p>
            </div>
            {unresolvedConflicts.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => autoResolveAllConflicts('prefer_construction')}
                >
                  全部采用构造值
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => autoResolveAllConflicts('prefer_material')}
                >
                  全部采用材料值
                </Button>
              </div>
            )}
          </div>

          {unresolvedConflicts.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                待处理冲突
              </h4>
              {unresolvedConflicts.map(conflict => (
                <div
                  key={conflict.id}
                  className="border border-amber-200 bg-amber-50 rounded-lg p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="amber">
                        {CONFLICT_TYPE_LABELS[conflict.type]}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {conflict.fieldName}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded p-3 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">构造数据</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-800 font-mono">
                        {formatValue(conflict.constructionValue, conflict.type)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span>{conflict.constructionMaintainer}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{conflict.constructionSource}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-slate-300" />
                    </div>

                    <div className="bg-white rounded p-3 border border-slate-200 md:-ml-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">材料数据</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-800 font-mono">
                        {formatValue(conflict.materialValue, conflict.type)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span>{conflict.materialMaintainer}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{conflict.materialSource}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(conflict.id, 'construction')}
                    >
                      采用构造值
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(conflict.id, 'material')}
                    >
                      采用材料值
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCustomInput(prev => ({ ...prev, [conflict.id]: !prev[conflict.id] }))}
                    >
                      自定义
                    </Button>
                  </div>

                  {showCustomInput[conflict.id] && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="输入自定义值..."
                        value={customValue[conflict.id] || ''}
                        onChange={(e) => setCustomValue(prev => ({ ...prev, [conflict.id]: e.target.value }))}
                        step="any"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResolve(conflict.id, 'custom', customValue[conflict.id])}
                        disabled={!customValue[conflict.id]}
                      >
                        确认
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {resolvedConflicts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                已解决冲突 ({resolvedConflicts.length})
              </h4>
              {resolvedConflicts.map(conflict => (
                <div
                  key={conflict.id}
                  className="border border-emerald-200 bg-emerald-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="success">已解决</Badge>
                      <span className="text-sm text-slate-600">
                        {CONFLICT_TYPE_LABELS[conflict.type]}: {conflict.fieldName}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">
                        裁决值: <span className="font-mono">{formatValue(conflict.resolvedValue!, conflict.type)}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {conflict.resolvedBy} · {formatDate(conflict.resolvedAt)}
                      </p>
                    </div>
                  </div>
                  {conflict.resolutionNote && (
                    <p className="text-xs text-slate-500 mt-2 bg-white rounded p-2">
                      {conflict.resolutionNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
