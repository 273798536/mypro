import { useState } from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useThermoStore } from '../../hooks/useThermoStore';
import { ANOMALY_LABELS } from '../../types';

export default function AnomalyDisplay() {
  const { anomalies, setSelectedPoint, setSelectedProcess } = useThermoStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleJumpToSource = (anomaly: typeof anomalies[0]) => {
    if (anomaly.sourceRef.type === 'state_point' && anomaly.sourceRef.id) {
      setSelectedPoint(anomaly.sourceRef.id);
    } else if (anomaly.sourceRef.type === 'process' && anomaly.sourceRef.id) {
      setSelectedProcess(anomaly.sourceRef.id);
    }
  };

  if (anomalies.length === 0) {
    return (
      <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700 text-center">
        <div className="text-emerald-400 mb-2">✓</div>
        <p className="text-slate-400 text-sm">未检测到异常</p>
        <p className="text-slate-500 text-xs mt-1">所有状态点和过程均符合热力学定律</p>
      </div>
    );
  }

  const errors = anomalies.filter(a => a.severity === 'error');
  const warnings = anomalies.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">异常检测</h3>
        <div className="flex items-center gap-2 text-xs">
          {errors.length > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded">
              {errors.length} 错误
            </span>
          )}
          {warnings.length > 0 && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded">
              {warnings.length} 警告
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {anomalies.map(anomaly => (
          <div
            key={anomaly.id}
            className={`rounded-lg border overflow-hidden ${
              anomaly.severity === 'error'
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-amber-900/20 border-amber-500/30'
            }`}
          >
            <div
              className="p-3 cursor-pointer hover:bg-opacity-50 transition-colors"
              onClick={() => toggleExpand(anomaly.id)}
            >
              <div className="flex items-start gap-3">
                {anomaly.severity === 'error' ? (
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                ) : (
                  <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {ANOMALY_LABELS[anomaly.type]}
                    </span>
                    {expandedId === anomaly.id ? (
                      <ChevronUp size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-200 mt-1">{anomaly.message}</p>
                </div>
              </div>
            </div>

            {expandedId === anomaly.id && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
                <div className="space-y-2 text-xs">
                  {anomaly.sourceRef.originalValue && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500">原始值:</span>
                      <code className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">
                        {anomaly.sourceRef.originalValue}
                      </code>
                    </div>
                  )}
                  {anomaly.sourceRef.lineNumber !== undefined && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-500" />
                      <span className="text-slate-500">行号: {anomaly.sourceRef.lineNumber}</span>
                    </div>
                  )}
                  {anomaly.sourceRef.field && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">字段:</span>
                      <span className="text-slate-300">{anomaly.sourceRef.field}</span>
                    </div>
                  )}
                  {anomaly.suggestion && (
                    <div className="p-2 bg-slate-800/50 rounded">
                      <span className="text-slate-500">建议: </span>
                      <span className="text-slate-300">{anomaly.suggestion}</span>
                    </div>
                  )}
                  {(anomaly.sourceRef.type === 'state_point' || anomaly.sourceRef.type === 'process') && anomaly.sourceRef.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJumpToSource(anomaly); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                    >
                      跳转到{anomaly.sourceRef.type === 'state_point' ? '状态点' : '过程'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
