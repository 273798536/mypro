import { X, ArrowRight, Thermometer, Box, Ruler, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RangingRecord } from '../../types';
import { ANOMALY_LABELS, ANOMALY_COLORS } from '../../constants/anomalies';
import { formatDistance } from '../../utils/unitConversion';

interface RecordDetailModalProps {
  record: RangingRecord | null;
  onClose: () => void;
}

export const RecordDetailModal = ({ record, onClose }: RecordDetailModalProps) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">记录详情</h2>
            <p className="text-sm text-gray-500">ID: {record.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-[#3E92CC]" />
                <span className="text-sm font-medium text-gray-600">测距数据</span>
              </div>
              <p className="text-2xl font-mono font-bold text-[#0A2463]">
                {record.rawDistance}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {record.rawDistanceUnit}
                </span>
              </p>
              {record.calibratedDistance !== undefined && (
                <p className="text-sm text-gray-500 mt-1">
                  校准后: <span className="font-mono font-medium text-green-600">
                    {formatDistance(record.calibratedDistance)} m
                  </span>
                </p>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-600">环境温度</span>
              </div>
              <p className="text-2xl font-mono font-bold text-orange-600">
                {record.temperature.toFixed(1)}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {record.temperatureUnit === 'C' ? '°C' : record.temperatureUnit}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                发射频率: <span className="font-mono">{record.frequency.toFixed(1)} kHz</span>
              </p>
            </div>
          </div>

          {record.reflectiveMaterial && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Box className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-600">反射面材质</span>
                {record.affectedByMaterial && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    已影响校准结果
                  </span>
                )}
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-lg font-medium text-purple-700">{record.reflectiveMaterial}</p>
                {record.materialCorrection !== undefined && record.materialCorrection !== 0 && (
                  <p className="text-sm text-purple-600 mt-1">
                    材质校正量: {(record.materialCorrection * 1000).toFixed(2)} mm
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">校准轨迹</h3>
            <div className="space-y-3">
              {record.calibrationSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === record.calibrationSteps.length - 1 
                        ? 'bg-[#3E92CC] text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {index < record.calibrationSteps.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{step.stepName}</span>
                      <span className="text-sm text-gray-500 font-mono">
                        {step.beforeValue.toFixed(4)} m
                        <ArrowRight className="w-4 h-4 inline mx-1" />
                        {step.afterValue.toFixed(4)} m
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                      {step.formula}
                    </p>
                  </div>
                </div>
              ))}
              {record.calibrationSteps.length === 0 && (
                <p className="text-gray-400 text-center py-4">未执行校准步骤</p>
              )}
            </div>
          </div>

          {record.anomalies.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">异常信息</h3>
              <div className="space-y-3">
                {record.anomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-xl border ${
                      anomaly.isResolved 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${
                          anomaly.isResolved ? 'text-green-500' : 'text-red-500'
                        }`} />
                        <div>
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-1"
                            style={{ 
                              backgroundColor: `${ANOMALY_COLORS[anomaly.type]}20`,
                              color: ANOMALY_COLORS[anomaly.type]
                            }}
                          >
                            {ANOMALY_LABELS[anomaly.type]}
                          </span>
                          <p className="text-sm text-gray-700">{anomaly.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">建议: </span>{anomaly.suggestion}
                          </p>
                        </div>
                      </div>
                      {anomaly.isResolved && (
                        <span className="text-xs text-green-600 font-medium">已解决</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
