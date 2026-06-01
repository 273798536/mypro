import React from 'react';
import { 
  AnomalyDetail, 
  ANOMALY_TYPE_LABELS, 
  SEVERITY_COLORS, 
  SEVERITY_LABELS 
} from '../types';

interface AnomalyListProps {
  anomalies: AnomalyDetail[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (anomalyId: string) => void;
  onFocusAnomaly: (anomalyId: string) => void;
}

const AnomalyList: React.FC<AnomalyListProps> = ({
  anomalies,
  selectedAnomalyId,
  onSelectAnomaly,
  onFocusAnomaly
}) => {
  const groupedAnomalies = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.type]) {
      acc[anomaly.type] = [];
    }
    acc[anomaly.type].push(anomaly);
    return acc;
  }, {} as Record<string, AnomalyDetail[]>);

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="bg-spectrum-mid/90 backdrop-blur-sm rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        异常检测结果
        <span className="ml-auto text-sm font-normal text-gray-400">
          {anomalies.length} 项
        </span>
      </h3>

      {anomalies.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>未检测到异常</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(groupedAnomalies).map(([type, typeAnomalies]) => (
            <div key={type}>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                <span>{ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS]}</span>
                <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                  {typeAnomalies.length}
                </span>
              </div>
              <div className="space-y-1">
                {typeAnomalies
                  .sort((a, b) => 
                    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
                  )
                  .map((anomaly) => (
                    <div
                      key={anomaly.id}
                      onClick={() => onSelectAnomaly(anomaly.id)}
                      className={`p-2 rounded cursor-pointer transition-all ${
                        selectedAnomalyId === anomaly.id
                          ? 'bg-blue-600/30 border border-blue-500'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-300 truncate">
                            {anomaly.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: `${SEVERITY_COLORS[anomaly.severity]}20`,
                                color: SEVERITY_COLORS[anomaly.severity]
                              }}
                            >
                              {SEVERITY_LABELS[anomaly.severity]}
                            </span>
                            {anomaly.frameIndex !== undefined && (
                              <span className="text-gray-500">
                                帧 {anomaly.frameIndex}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusAnomaly(anomaly.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                          title="定位到3D视图"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnomalyList;
