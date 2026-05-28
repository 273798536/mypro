import { useState } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertCircle,
  Info,
  Check,
} from 'lucide-react';
import {
  getAnomalyTypeLabel,
  getAnomalySeverityLabel,
  getAnomalySeverityColor,
  getAnomalySeverityBgColor,
} from '../engine/anomalyDetector';

export default function AlertPanel() {
  const { calculationResult, resolveAnomaly } = useInterpolatorStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  if (!calculationResult || calculationResult.anomalies.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-accent-success/10 border border-accent-success/30">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-accent-success" size={20} />
          <div>
            <p className="text-accent-success font-medium">一切正常</p>
            <p className="text-sm text-primary-400">未检测到异常数据</p>
          </div>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'duplicate': return <XCircle size={18} />;
      case 'extrapolation': return <AlertCircle size={18} />;
      case 'oscillation': return <AlertTriangle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const handleResolve = (anomalyId: string) => {
    resolveAnomaly(anomalyId, resolutionNote || '已确认并标记为已处理');
    setResolutionNote('');
    setExpandedId(null);
  };

  const unresolvedCount = calculationResult.anomalies.filter(a => !a.resolved).length;
  const resolvedCount = calculationResult.anomalies.filter(a => a.resolved).length;
  const needReviewCount = calculationResult.anomalies.filter(a => a.severity === 'error' && !a.resolved).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-primary-200 flex items-center gap-2">
          <AlertTriangle size={18} className="text-accent-warning" />
          异常检测结果
        </h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-accent-error/20 text-accent-error">
            {unresolvedCount} 未处理
          </span>
          <span className="px-2 py-1 rounded-full bg-accent-warning/20 text-accent-warning">
            {needReviewCount} 需确认
          </span>
          <span className="px-2 py-1 rounded-full bg-accent-success/20 text-accent-success">
            {resolvedCount} 已修正
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {calculationResult.anomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className={`rounded-lg border transition-all ${
              getAnomalySeverityBgColor(anomaly.severity)
            } ${anomaly.resolved ? 'opacity-60' : ''}`}
          >
            <button
              onClick={() => setExpandedId(expandedId === anomaly.id ? null : anomaly.id)}
              className="w-full p-3 flex items-start gap-3 text-left"
            >
              <div className={`mt-0.5 ${getAnomalySeverityColor(anomaly.severity)}`}>
                {anomaly.resolved ? <CheckCircle size={18} /> : getTypeIcon(anomaly.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getAnomalySeverityColor(anomaly.severity)}`}>
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-800/50 text-primary-400">
                    {getAnomalySeverityLabel(anomaly.severity)}
                  </span>
                  {anomaly.resolved && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-success/20 text-accent-success">
                      已修正
                    </span>
                  )}
                </div>
                <p className="text-sm text-primary-300 mt-1 line-clamp-2">
                  {anomaly.message}
                </p>
                <p className="text-xs text-primary-500 mt-1">
                  影响 {anomaly.affectedIndices.length} 个点 · {new Date(anomaly.timestamp).toLocaleTimeString('zh-CN')}
                </p>
              </div>
              <div className="text-primary-500">
                {expandedId === anomaly.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expandedId === anomaly.id && (
              <div className="px-3 pb-3 border-t border-primary-700/30 pt-3 mt-2">
                <p className="text-xs text-primary-400 mb-2">
                  受影响的点索引: {anomaly.affectedIndices.join(', ')}
                </p>
                
                {anomaly.resolutionNote && (
                  <div className="mb-3 p-2 rounded bg-primary-800/30">
                    <p className="text-xs text-primary-500">修正说明:</p>
                    <p className="text-sm text-primary-300">{anomaly.resolutionNote}</p>
                  </div>
                )}

                {!anomaly.resolved && (
                  <div className="space-y-2">
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="输入修正说明（可选）"
                      className="w-full px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(anomaly.id)}
                        className="flex-1 py-2 bg-accent-success hover:bg-accent-success/80 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        标记为已修正
                      </button>
                      <button
                        onClick={() => {
                          resolveAnomaly(anomaly.id, '需要人工进一步确认');
                          setExpandedId(null);
                        }}
                        className="px-4 py-2 bg-accent-warning hover:bg-accent-warning/80 text-white text-sm rounded-lg transition-colors"
                      >
                        需人工确认
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
