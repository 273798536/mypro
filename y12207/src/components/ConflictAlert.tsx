import { AlertCircle, ChevronRight, Check } from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { conflictTypeLabels } from '@/data/mockData';
import { Link } from 'react-router-dom';

export default function ConflictAlert() {
  const { conflicts, resolveConflict, selectValuation } = useValuationStore();
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  if (unresolvedConflicts.length === 0) return null;

  const getConflictColor = (type: string) => {
    switch (type) {
      case 'caliber_mismatch': return 'border-l-red-500 bg-red-50';
      case 'missing_period': return 'border-l-amber-500 bg-amber-50';
      case 'duplicate_adjustment': return 'border-l-orange-500 bg-orange-50';
      case 'data_inconsistency': return 'border-l-rose-500 bg-rose-50';
      default: return 'border-l-slate-500 bg-slate-50';
    }
  };

  const handleResolve = (conflictId: string) => {
    resolveConflict(conflictId, '当前用户');
  };

  const handleGoToValuation = (valuationId: string) => {
    selectValuation(valuationId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-slate-800">数据冲突预警</h3>
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          {unresolvedConflicts.length} 项待处理
        </span>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {unresolvedConflicts.map((conflict) => (
          <div
            key={conflict.conflictId}
            className={`border-l-4 rounded-r-lg p-4 ${getConflictColor(conflict.conflictType)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded text-slate-600">
                    {conflictTypeLabels[conflict.conflictType]}
                  </span>
                  <span className="text-xs text-slate-500">{conflict.projectName}</span>
                </div>
                <p className="text-sm text-slate-700">{conflict.description}</p>
                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-medium">定位：</span>
                  {conflict.location.source}
                  {conflict.location.row && `，第 ${conflict.location.row} 行`}
                  {conflict.location.field && `，字段：${conflict.location.field}`}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleResolve(conflict.conflictId)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-emerald-600 transition-colors"
                  title="标记已解决"
                >
                  <Check className="w-4 h-4" />
                </button>
                <Link
                  to="/compare"
                  onClick={() => handleGoToValuation(conflict.valuationId)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-primary-600 transition-colors"
                  title="前往处理"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
