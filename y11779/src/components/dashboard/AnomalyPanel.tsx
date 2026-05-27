import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Tag, BarChart3, Clock } from 'lucide-react';
import type { AnomalyRecord, AnomalyType } from '../../types';
import { getAnomalyTypeLabel, getAnomalyTypeColor } from '../../utils/anomalyDetection';
import { formatRelativeTime, truncateText } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';

interface AnomalyPanelProps {
  anomalies: AnomalyRecord[];
  onSelectAnomaly: (anomaly: AnomalyRecord) => void;
  onResolve: (anomalyId: string, resolution: string) => void;
  selectedAnomalyId?: string | null;
}

const AnomalyPanel: React.FC<AnomalyPanelProps> = ({ 
  anomalies, 
  onSelectAnomaly,
  onResolve,
  selectedAnomalyId 
}) => {
  const [expandedTypes, setExpandedTypes] = useState<Set<AnomalyType>>(new Set(['promotion', 'coverage', 'sample']));
  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const toggleType = (type: AnomalyType) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const groupedAnomalies = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.type]) {
      acc[anomaly.type] = [];
    }
    acc[anomaly.type].push(anomaly);
    return acc;
  }, {} as Record<AnomalyType, AnomalyRecord[]>);

  const typeIcons: Record<AnomalyType, React.ReactNode> = {
    promotion: <Tag className="w-5 h-5" />,
    coverage: <AlertTriangle className="w-5 h-5" />,
    sample: <BarChart3 className="w-5 h-5" />
  };

  const handleResolve = (anomalyId: string) => {
    if (resolutionText.trim()) {
      onResolve(anomalyId, resolutionText);
      setShowResolveModal(null);
      setResolutionText('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">异常检测中心</h3>
          <span className="text-sm text-slate-500">
            共 {anomalies.filter(a => !a.resolved).length} 个待处理
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {(['promotion', 'coverage', 'sample'] as AnomalyType[]).map((type) => {
          const typeAnomalies = groupedAnomalies[type] || [];
          const unresolvedCount = typeAnomalies.filter(a => !a.resolved).length;
          const color = getAnomalyTypeColor(type);
          const isExpanded = expandedTypes.has(type);

          return (
            <div key={type}>
              <button
                onClick={() => toggleType(type)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {typeIcons[type]}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-800">{getAnomalyTypeLabel(type)}</p>
                    <p className="text-xs text-slate-500">{typeAnomalies.length} 条记录</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unresolvedCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {unresolvedCount} 待处理
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>
              
              {isExpanded && typeAnomalies.length > 0 && (
                <div className="bg-slate-50">
                  {typeAnomalies.slice(0, 10).map((anomaly) => (
                    <div
                      key={anomaly.id}
                      onClick={() => onSelectAnomaly(anomaly)}
                      className={`px-4 py-3 cursor-pointer transition-colors border-l-4 ${
                        selectedAnomalyId === anomaly.id 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'hover:bg-slate-100 border-transparent'
                      } ${anomaly.resolved ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge type="severity" value={anomaly.severity} size="sm" />
                            {anomaly.resolved && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                已处理
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">
                            {truncateText(anomaly.description, 60)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(anomaly.timestamp)}
                          </div>
                        </div>
                        {!anomaly.resolved && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowResolveModal(anomaly.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                          >
                            标记处理
                          </button>
                        )}
                      </div>
                      
                      {showResolveModal === anomaly.id && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                          <textarea
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            placeholder="输入处理说明..."
                            className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowResolveModal(null);
                                setResolutionText('');
                              }}
                              className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                            >
                              取消
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(anomaly.id);
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              确认
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {typeAnomalies.length > 10 && (
                    <div className="px-4 py-2 text-center text-sm text-slate-500">
                      还有 {typeAnomalies.length - 10} 条记录...
                    </div>
                  )}
                </div>
              )}
              
              {isExpanded && typeAnomalies.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  暂无此类异常
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnomalyPanel;
