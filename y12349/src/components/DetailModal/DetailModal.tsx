import { X, AlertTriangle, Zap, Thermometer, FileText, Link2 } from 'lucide-react';
import { useBatteryStore } from '../../store/useBatteryStore';
import { Anomaly } from '../../types';

export const DetailModal = () => {
  const { selectedAnomaly, showDetailModal, setShowDetailModal, selectAnomaly, currentBatch } = useBatteryStore();

  if (!showDetailModal || !selectedAnomaly) return null;

  const getAnomalyInfo = (type: Anomaly['type']) => {
    switch (type) {
      case 'interruption':
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          label: '中断重启',
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30'
        };
      case 'rate_change':
        return {
          icon: <Zap className="w-6 h-6" />,
          label: '倍率切换',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/30'
        };
      case 'temperature_drift':
        return {
          icon: <Thermometer className="w-6 h-6" />,
          label: '温度漂移',
          color: 'text-orange-400',
          bgColor: 'bg-orange-400/10',
          borderColor: 'border-orange-400/30'
        };
    }
  };

  const getSeverityInfo = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return { label: '高风险', color: 'text-red-400 bg-red-400/10' };
      case 'medium':
        return { label: '中风险', color: 'text-yellow-400 bg-yellow-400/10' };
      case 'low':
        return { label: '低风险', color: 'text-green-400 bg-green-400/10' };
    }
  };

  const info = getAnomalyInfo(selectedAnomaly.type);
  const severity = getSeverityInfo(selectedAnomaly.severity);

  const relatedCycle = currentBatch?.cycles.find(
    (c) => c.cycleNumber === selectedAnomaly.cycleNumber
  );

  const handleClose = () => {
    setShowDetailModal(false);
    selectAnomaly(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-2xl mx-4 bg-dark-light rounded-2xl border border-dark-lighter shadow-2xl animate-fade-in max-h-[85vh] overflow-hidden flex flex-col">
        <div className={`p-6 border-b ${info.borderColor} ${info.bgColor} bg-gradient-to-r from-transparent to-transparent`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${info.bgColor} ${info.color}`}>
                {info.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{info.label}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.color}`}>
                    {severity.label}
                  </span>
                  <span className="font-mono text-sm text-gray-400">
                    第 {selectedAnomaly.cycleNumber} 次循环
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-dark-lighter transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              事件描述
            </h3>
            <p className="text-gray-200">{selectedAnomaly.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              发生时间: {new Date(selectedAnomaly.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>

          {relatedCycle && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">关联循环数据</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-lighter/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">容量保持率</div>
                  <div className="font-mono text-lg text-primary">
                    {relatedCycle.capacityRetention.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-dark-lighter/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">充放电倍率</div>
                  <div className="font-mono text-lg text-yellow-400">
                    {relatedCycle.chargeRate}C/{relatedCycle.dischargeRate}C
                  </div>
                </div>
                <div className="bg-dark-lighter/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">平均温度</div>
                  <div className="font-mono text-lg text-orange-400">
                    {relatedCycle.avgTemperature.toFixed(1)}°C
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">根本原因分析</h3>
            <div className="bg-dark-lighter/30 rounded-lg p-4 border border-dark-lighter">
              <p className="text-gray-300 leading-relaxed">{selectedAnomaly.cause}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">处理建议</h3>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="space-y-2">
                {selectedAnomaly.suggestion.split(/\d+\.\s*/).filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <p className="text-gray-300">{item.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              数据来源追溯
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedAnomaly.dataSources.map((source, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-dark-lighter rounded text-xs text-gray-400 font-mono"
                >
                  {source}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              以上记录均可在对应数据源文件中进行复核验证
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-dark-lighter flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-dark-lighter hover:bg-dark-lighter/80 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
