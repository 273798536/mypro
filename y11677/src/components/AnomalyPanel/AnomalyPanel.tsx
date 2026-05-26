import { useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, XCircle, CheckCircle, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAnomalyTypeLabel, getSeverityColor, getSeverityLabel } from '../../utils/anomalyDetector';
import type { Anomaly } from '../../types';

export const AnomalyPanel = () => {
  const { anomalies, currentFrameIndex, setCurrentFrameIndex, correctAnomaly, selectedAnomalyId, setSelectedAnomalyId } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedAnomalies = useMemo(() => {
    const groups: Record<string, Anomaly[]> = {
      quaternion_not_normalized: [],
      timestamp_out_of_order: [],
      drift_detected: [],
      sensor_abnormal: [],
    };

    anomalies.forEach((anomaly) => {
      groups[anomaly.type]?.push(anomaly);
    });

    return groups;
  }, [anomalies]);

  const stats = useMemo(() => {
    return {
      total: anomalies.length,
      warning: anomalies.filter((a) => a.severity === 'warning').length,
      error: anomalies.filter((a) => a.severity === 'error').length,
      critical: anomalies.filter((a) => a.severity === 'critical').length,
      corrected: anomalies.filter((a) => a.correction).length,
    };
  }, [anomalies]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle size={14} className="text-[#ff9500]" />;
      case 'error':
        return <AlertCircle size={14} className="text-[#ff3b30]" />;
      case 'critical':
        return <XCircle size={14} className="text-[#af0000]" />;
      default:
        return null;
    }
  };

  const handleJumpToFrame = (frameIndex: number) => {
    setCurrentFrameIndex(frameIndex);
  };

  const handleCorrect = (anomalyId: string) => {
    correctAnomaly(anomalyId, '用户手动修正');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0f1d30] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#00d4ff]">{stats.total}</div>
          <div className="text-xs text-gray-500">总异常数</div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.corrected}</div>
          <div className="text-xs text-gray-500">已修正</div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-[#ff9500]">{stats.warning}</div>
          <div className="text-xs text-gray-500">警告</div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-[#ff3b30]">{stats.error + stats.critical}</div>
          <div className="text-xs text-gray-50">错误/严重</div>
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-green-500 opacity-50" />
          <p>未检测到任何异常</p>
          <p className="text-xs mt-1">数据质量良好</p>
        </div>
      ) : (
        Object.entries(groupedAnomalies).map(([type, typeAnomalies]) => {
          if (typeAnomalies.length === 0) return null;

          return (
            <div key={type} className="bg-[#0f1d30] rounded-lg overflow-hidden">
              <div className="bg-[#1a2a4a] px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-bold text-[#00d4ff]">
                  {getAnomalyTypeLabel(type)}
                </span>
                <span className="text-xs text-gray-500">
                  {typeAnomalies.length} 处
                </span>
              </div>
              <div className="divide-y divide-[#1a2a4a]">
                {typeAnomalies.slice(0, 10).map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      anomaly.frameIndex === currentFrameIndex
                        ? 'bg-[#00d4ff]/10'
                        : 'hover:bg-[#1a2a4a]/50'
                    }`}
                    onClick={() => handleJumpToFrame(anomaly.frameIndex)}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(anomaly.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: `${getSeverityColor(anomaly.severity)}20`,
                              color: getSeverityColor(anomaly.severity),
                            }}
                          >
                            {getSeverityLabel(anomaly.severity)}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            帧 {anomaly.frameIndex + 1}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">{anomaly.description}</p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {formatTime(anomaly.timestamp)}
                        </p>

                        {expandedId === anomaly.id && anomaly.details && (
                          <div className="mt-2 p-2 bg-[#0a1628] rounded text-[10px] text-gray-400 font-mono">
                            <pre>{JSON.stringify(anomaly.details, null, 2)}</pre>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(anomaly.id);
                            }}
                            className="text-xs text-[#00d4ff] hover:text-[#00b8e0] flex items-center gap-1"
                          >
                            {expandedId === anomaly.id ? (
                              <>
                                <ChevronUp size={12} /> 收起详情
                              </>
                            ) : (
                              <>
                                <ChevronDown size={12} /> 查看详情
                              </>
                            )}
                          </button>

                          {!anomaly.correction && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCorrect(anomaly.id);
                              }}
                              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                            >
                              <Wrench size={12} /> 修正
                            </button>
                          )}

                          {anomaly.correction && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle size={12} /> 已修正
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {typeAnomalies.length > 10 && (
                  <div className="p-2 text-center text-xs text-gray-500">
                    还有 {typeAnomalies.length - 10} 处异常...
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {stats.total > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-200">
              <p className="font-bold mb-1">修正说明</p>
              <p>点击异常条目可跳转到对应帧。点击"修正"按钮可应用自动修正。</p>
              <p className="mt-1">所有修正操作都会被记录，可在报告中查看完整修正历史。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
