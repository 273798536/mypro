import { useCallback } from 'react';
import { AlertTriangle, XCircle, Info, ArrowRight, RefreshCw } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import type { Anomaly } from '../types';

export function AnomalyAlert() {
  const { currentRecord, setParameters } = useAnalysisStore();

  const handleFixDirection = useCallback((suggestedDirection: 'approaching' | 'receding') => {
    setParameters({ direction: suggestedDirection });
  }, [setParameters]);

  const handleFixSampleRate = useCallback((fileSampleRate: number) => {
    setParameters({ sampleRate: fileSampleRate });
  }, [setParameters]);

  if (!currentRecord || currentRecord.anomalies.length === 0) {
    return null;
  }

  const getAnomalyIcon = (type: Anomaly['type'], severity: Anomaly['severity']) => {
    if (severity === 'error') {
      return <XCircle className="w-5 h-5 text-error-400" />;
    }
    return <AlertTriangle className="w-5 h-5 text-warning-400" />;
  };

  const getAnomalyStyle = (severity: Anomaly['severity']) => {
    if (severity === 'error') {
      return 'border-error-500/50 bg-error-500/10';
    }
    return 'border-warning-500/50 bg-warning-500/10';
  };

  const renderActionButton = (anomaly: Anomaly) => {
    if (anomaly.type === 'direction_error' && currentRecord) {
      const suggestedDirection = anomaly.message.includes('靠近') ? 'approaching' : 'receding';
      return (
        <button
          onClick={() => handleFixDirection(suggestedDirection)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          修正方向
        </button>
      );
    }

    if (anomaly.type === 'sample_rate_mismatch' && currentRecord) {
      return (
        <button
          onClick={() => handleFixSampleRate(currentRecord.source.sampleRate)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          使用文件采样率
        </button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3">
      {currentRecord.anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`rounded-xl border p-4 ${getAnomalyStyle(anomaly.severity)}`}
        >
          <div className="flex items-start gap-3">
            {getAnomalyIcon(anomaly.type, anomaly.severity)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-sm font-medium ${
                  anomaly.severity === 'error' ? 'text-error-300' : 'text-warning-300'
                }`}>
                  {anomaly.severity === 'error' ? '错误' : '警告'}
                </span>
                {renderActionButton(anomaly)}
              </div>
              <p className="text-sm text-white mb-1">{anomaly.message}</p>
              <p className="text-xs text-dark-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {anomaly.suggestion}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
