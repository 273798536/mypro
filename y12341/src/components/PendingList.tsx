import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ANOMALY_TYPE_LABELS } from '@/types';

export default function PendingList() {
  const { experiments, anomalies, dispatch, recalculateSingle } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState<Set<string>>(new Set());

  const pendingExperiments = experiments.filter((e) => e.status === 'pending');

  useEffect(() => {
    const ids = new Set(pendingExperiments.map((e) => e.id));
    setAnimateIn(ids);
    const timer = setTimeout(() => setAnimateIn(new Set()), 600);
    return () => clearTimeout(timer);
  }, [pendingExperiments.length]);

  const handleConfirm = (expId: string) => {
    dispatch({ type: 'CONFIRM_PENDING', payload: expId });
    recalculateSingle(expId);
  };

  const handleReject = (expId: string) => {
    dispatch({ type: 'REJECT_PENDING', payload: expId });
  };

  const getExpAnomalies = (expId: string) =>
    anomalies.filter((a) => a.experimentId === expId && a.severity === 'warning');

  return (
    <div className="bg-white rounded-lg border-2 border-amber-300 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-amber-50 border-b-2 border-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3
            className="font-semibold text-amber-800"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            待确认清单
          </h3>
          <span className="text-sm font-medium bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
            {pendingExperiments.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {pendingExperiments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-amber-400">
            <div className="text-center">
              <Clock className="w-10 h-10 mx-auto mb-1 opacity-50" />
              <p className="text-sm">暂无待确认项</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-amber-100">
            {pendingExperiments.map((exp) => {
              const expAnomalies = getExpAnomalies(exp.id);
              const isExpanded = expandedId === exp.id;
              const shouldAnimate = animateIn.has(exp.id);

              return (
                <div
                  key={exp.id}
                  className={`p-3 bg-amber-50/50 transition-all ${
                    shouldAnimate ? 'animate-shake' : ''
                  }`}
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : exp.id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-amber-800">
                          {exp.materialId || '未命名材料'}
                        </span>
                        <span className="text-xs text-amber-600">
                          {exp.temperaturePoints.length}点 · {exp.sourceFile}
                        </span>
                      </div>
                      <div className="text-xs text-amber-700 space-y-0.5">
                        {expAnomalies.map((a, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                            {ANOMALY_TYPE_LABELS[a.type]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                      {expAnomalies.map((a, idx) => (
                        <div key={idx} className="text-xs text-amber-800 bg-amber-100/50 p-2 rounded">
                          <div className="font-medium mb-1">
                            {ANOMALY_TYPE_LABELS[a.type]}
                          </div>
                          <div className="text-amber-700">{a.description}</div>
                        </div>
                      ))}

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/80 p-2 rounded">
                          <div className="text-amber-600">材料编号</div>
                          <div className="font-mono text-amber-800">
                            {exp.materialId || '-'}
                          </div>
                        </div>
                        <div className="bg-white/80 p-2 rounded">
                          <div className="text-amber-600">厚度 (m)</div>
                          <div
                            className={`font-mono ${
                              exp.thickness == null
                                ? 'text-red-600'
                                : 'text-amber-800'
                            }`}
                          >
                            {exp.thickness != null
                              ? exp.thickness.toExponential(3)
                              : '缺失'}
                          </div>
                        </div>
                        <div className="bg-white/80 p-2 rounded">
                          <div className="text-amber-600">边界温度 (°C)</div>
                          <div
                            className={`font-mono ${
                              exp.boundaryTemp == null
                                ? 'text-red-600'
                                : 'text-amber-800'
                            }`}
                          >
                            {exp.boundaryTemp != null
                              ? exp.boundaryTemp.toFixed(1)
                              : '缺失'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirm(exp.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          确认有效，继续计算
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(exp.id);
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          标记为异常
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
}
