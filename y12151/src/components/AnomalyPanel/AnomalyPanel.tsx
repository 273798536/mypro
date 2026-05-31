import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { ANOMALY_LABELS, ANOMALY_DESCRIPTIONS, ANOMALY_SUGGESTIONS } from '../../constants/anomalies';

export const AnomalyPanel = () => {
  const { records, resolveAnomaly } = useCalibrationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allAnomalies = records.flatMap(record => 
    record.anomalies
      .filter(a => !a.isResolved)
      .map(anomaly => ({ ...anomaly, recordId: record.id }))
  );

  const groupedAnomalies = allAnomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.type]) {
      acc[anomaly.type] = [];
    }
    acc[anomaly.type].push(anomaly);
    return acc;
  }, {} as Record<string, typeof allAnomalies>);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">异常检测</h3>
            <p className="text-sm text-gray-500">
              共检测到 {allAnomalies.length} 个异常
            </p>
          </div>
        </div>
      </div>

      {allAnomalies.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="text-gray-500">暂无异常数据</p>
          <p className="text-sm text-gray-400 mt-1">所有记录均已通过校准检查</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedAnomalies).map(([type, anomalies]) => (
            <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === type ? null : type)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {anomalies.length}
                  </span>
                  <span className="font-medium text-gray-700">
                    {ANOMALY_LABELS[type as keyof typeof ANOMALY_LABELS]}
                  </span>
                </div>
                {expandedId === type ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {expandedId === type && (
                <div className="p-4 space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800">说明</p>
                        <p className="text-blue-700 mt-1">
                          {ANOMALY_DESCRIPTIONS[type as keyof typeof ANOMALY_DESCRIPTIONS]}
                        </p>
                        <p className="text-blue-600 mt-1">
                          <span className="font-medium">建议: </span>
                          {ANOMALY_SUGGESTIONS[type as keyof typeof ANOMALY_SUGGESTIONS]}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {anomalies.slice(0, 5).map(anomaly => (
                      <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-700">
                            记录ID: {anomaly.recordId.slice(0, 8)}
                          </p>
                          {anomaly.value !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              检测值: {anomaly.value.toFixed(4)}
                              {anomaly.expectedRange && (
                                <span className="ml-2">
                                  期望范围: [{anomaly.expectedRange[0].toFixed(4)}, {anomaly.expectedRange[1].toFixed(4)}]
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => resolveAnomaly(anomaly.recordId, anomaly.id)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-green-600 transition-colors"
                          title="标记已解决"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {anomalies.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        还有 {anomalies.length - 5} 条同类异常
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
