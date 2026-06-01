import { AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Anomaly } from '../types';

export function AnomalyPanel() {
  const { anomalies, setFocusedRow } = useAppStore();

  const handleClick = (anomaly: Anomaly) => {
    if (anomaly.location.row !== undefined) {
      setFocusedRow(anomaly.location.row - 1);
    }
  };

  const getIcon = (severity: 'warning' | 'error') => {
    return severity === 'error' ? (
      <AlertCircle className="text-lab-danger flex-shrink-0" size={20} />
    ) : (
      <AlertTriangle className="text-lab-warning flex-shrink-0" size={20} />
    );
  };

  const getTypeLabel = (type: Anomaly['type']) => {
    const labels: Record<Anomaly['type'], string> = {
      background_not_deducted: '背景未扣',
      interval_error: '采样间隔错',
      abnormal_peak: '异常峰值',
      boundary_error: '边界值错误'
    };
    return labels[type];
  };

  const warnings = anomalies.filter(a => a.severity === 'warning');
  const errors = anomalies.filter(a => a.severity === 'error');

  return (
    <div className="lab-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          异常检测
        </h2>
        <div className="flex gap-3 text-sm">
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-lab-danger">
              <AlertCircle size={16} />
              {errors.length} 个错误
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-lab-warning">
              <AlertTriangle size={16} />
              {warnings.length} 个警告
            </span>
          )}
          {anomalies.length === 0 && (
            <span className="flex items-center gap-1 text-lab-success">
              <Info size={16} />
              未检测到异常
            </span>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
        {anomalies.length === 0 ? (
          <div className="text-center py-8 text-lab-muted">
            <div className="text-4xl mb-2">✅</div>
            <p>数据质量良好，未检测到异常</p>
          </div>
        ) : (
          anomalies.map((anomaly, index) => (
            <div
              key={index}
              onClick={() => handleClick(anomaly)}
              className={
                anomaly.severity === 'error' 
                  ? 'anomaly-card anomaly-card-error' 
                  : 'anomaly-card anomaly-card-warning'
              }
            >
              <div className="flex gap-3">
                {getIcon(anomaly.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={
                      anomaly.severity === 'error' 
                        ? 'text-xs font-medium px-2 py-0.5 rounded bg-lab-danger/20 text-lab-danger' 
                        : 'text-xs font-medium px-2 py-0.5 rounded bg-lab-warning/20 text-lab-warning'
                    }>
                      {getTypeLabel(anomaly.type)}
                    </span>
                    {anomaly.location.row !== undefined && (
                      <span className="text-xs text-lab-muted">
                        第 {anomaly.location.row} 行
                      </span>
                    )}
                  </div>
                  <p className="text-sm break-words">{anomaly.message}</p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-lab-muted">
                    <ArrowRight size={14} />
                    <span>{anomaly.suggestion}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
