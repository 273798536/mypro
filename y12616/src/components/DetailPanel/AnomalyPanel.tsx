
import React, { useState } from 'react';
import { AlertTriangle, MessageSquare, CheckCircle, FileText, ChevronDown, ChevronUp, Send, ArrowRight } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { anomalyTypeLabels } from '../../data/sampleData';

export const AnomalyPanel: React.FC = () => {
  const selectedPath = usePathStore((state) => state.getSelectedPath());
  const selectedAnomaly = usePathStore((state) => state.getSelectedAnomaly());
  const selectAnomaly = usePathStore((state) => state.selectAnomaly);
  const addNodeAnnotation = usePathStore((state) => state.addNodeAnnotation);
  const fixAnomaly = usePathStore((state) => state.fixAnomaly);
  const addHistoryAction = useHistoryStore((state) => state.addAction);
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());
  const [annotationText, setAnnotationText] = useState('');

  if (!selectedPath) {
    return null;
  }

  const allAnomalies = selectedPath.nodes.flatMap((node) =>
    node.anomalies.map((a) => ({ ...a, nodeId: node.id, nodeLabel: node.label }))
  );

  const toggleExpand = (id: string) => {
    const next = new Set(expandedAnomalies);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedAnomalies(next);
  };

  const handleSelectAnomaly = (nodeId: string, anomalyId: string) => {
    selectAnomaly(anomalyId);
    toggleExpand(anomalyId);
  };

  const handleAddAnnotation = () => {
    if (!selectedAnomaly || !annotationText.trim()) return;

    const node = selectedPath.nodes.find((n) => n.anomalies.some((a) => a.id === selectedAnomaly.id));
    if (!node) return;

    const prevAnnotation = selectedAnomaly.annotation || '';

    addHistoryAction(
      'add_annotation',
      `添加异常备注`,
      { pathId: selectedPath.id, nodeId: node.id, anomalyId: selectedAnomaly.id, annotation: prevAnnotation },
      { pathId: selectedPath.id, nodeId: node.id, anomalyId: selectedAnomaly.id, annotation: annotationText }
    );

    addNodeAnnotation(selectedPath.id, node.id, selectedAnomaly.id, annotationText);
    setAnnotationText('');
  };

  const handleFixAnomaly = () => {
    if (!selectedAnomaly) return;
    const node = selectedPath.nodes.find((n) => n.anomalies.some((a) => a.id === selectedAnomaly.id));
    if (!node) return;

    addHistoryAction(
      'fix_anomaly',
      `标记异常为已修复`,
      { pathId: selectedPath.id, nodeId: node.id, anomalyId: selectedAnomaly.id, isFixed: false },
      { pathId: selectedPath.id, nodeId: node.id, anomalyId: selectedAnomaly.id, isFixed: true }
    );

    fixAnomaly(selectedPath.id, node.id, selectedAnomaly.id);
  };

  const renderDiffValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value === null || value === undefined) return '-';
    return JSON.stringify(value);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-400" />
        异常检测
        {allAnomalies.filter((a) => !a.isFixed).length > 0 && (
          <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded">
            {allAnomalies.filter((a) => !a.isFixed).length}
          </span>
        )}
      </h3>

      {allAnomalies.length === 0 ? (
        <div className="text-center py-4 text-slate-500 text-xs">
          暂无异常检测结果
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {allAnomalies.map((anomaly) => {
            const typeInfo = anomalyTypeLabels[anomaly.type];
            const isExpanded = expandedAnomalies.has(anomaly.id);
            const isSelected = selectedAnomaly?.id === anomaly.id;

            return (
              <div
                key={anomaly.id}
                className={`
                  rounded-lg overflow-hidden border transition-all
                  ${anomaly.isFixed
                    ? 'bg-green-900/20 border-green-700/30'
                    : isSelected
                    ? 'bg-red-900/20 border-red-500/50'
                    : 'bg-slate-800/50 border-slate-700/50'
                  }
                `}
              >
                <div
                  className="flex items-start gap-2 p-2 cursor-pointer hover:bg-slate-700/30"
                  onClick={() => handleSelectAnomaly(anomaly.nodeId, anomaly.id)}
                >
                  <div
                    className="p-1 rounded mt-0.5"
                    style={{ backgroundColor: typeInfo?.color + '30' }}
                  >
                    {anomaly.isFixed ? (
                      <CheckCircle size={12} className="text-green-400" />
                    ) : (
                      <AlertTriangle size={12} style={{ color: typeInfo?.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: typeInfo?.color }}
                      >
                        {typeInfo?.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {anomaly.nodeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                      {anomaly.description}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={14} className="text-slate-400 mt-1" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400 mt-1" />
                  )}
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-2 border-t border-slate-700/50">
                    <div className="pt-2">
                      <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                        <FileText size={10} />
                        来源材料: {anomaly.sourceRef}
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-[10px] text-slate-400 mb-1.5">检测前后对比</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-[10px] text-red-400">检测前</div>
                          {Object.entries(anomaly.beforeState).map(([key, value]) => (
                            <div key={key} className="text-[10px]">
                              <span className="text-slate-500">{key}: </span>
                              <span className="text-slate-300">{renderDiffValue(value)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1 border-l border-slate-700 pl-2">
                          <div className="text-[10px] text-green-400 flex items-center gap-1">
                            <ArrowRight size={10} /> 检测后
                          </div>
                          {Object.entries(anomaly.afterState).map(([key, value]) => (
                            <div key={key} className="text-[10px]">
                              <span className="text-slate-500">{key}: </span>
                              <span className="text-slate-300">{renderDiffValue(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {anomaly.annotation && (
                      <div className="bg-yellow-500/10 rounded p-2 border border-yellow-500/30">
                        <div className="text-[10px] text-yellow-400 mb-1 flex items-center gap-1">
                          <MessageSquare size={10} />
                          人工备注
                        </div>
                        <p className="text-xs text-slate-300">{anomaly.annotation}</p>
                      </div>
                    )}

                    {!anomaly.isFixed && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={annotationText}
                            onChange={(e) => setAnnotationText(e.target.value)}
                            placeholder="添加备注..."
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddAnnotation();
                            }}
                            disabled={!annotationText.trim()}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFixAnomaly();
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors text-xs"
                        >
                          <CheckCircle size={12} />
                          标记为已修复
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
