import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { AlertTriangle, Droplets, Sun, CloudRain } from 'lucide-react';

export const AnomalyList: React.FC = () => {
  const { state } = useGameStore();
  const { anomalies } = state;

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'drought':
        return <Sun className="text-red-500" size={18} />;
      case 'overwater':
        return <CloudRain className="text-blue-500" size={18} />;
      case 'evaporation':
        return <Droplets className="text-orange-500" size={18} />;
      default:
        return <AlertTriangle className="text-yellow-500" size={18} />;
    }
  };

  const getAnomalyBg = (type: string) => {
    switch (type) {
      case 'drought':
        return 'bg-red-50 border-red-200';
      case 'overwater':
        return 'bg-blue-50 border-blue-200';
      case 'evaporation':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  if (anomalies.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <span className="text-green-600">✅ 暂无异常记录</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {anomalies.slice().reverse().map((anomaly, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getAnomalyBg(anomaly.type)} animate-fadeIn`}
        >
          {getAnomalyIcon(anomaly.type)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/80">
                回合 {anomaly.round}
              </span>
            </div>
            <p className="text-sm text-gray-700">{anomaly.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
