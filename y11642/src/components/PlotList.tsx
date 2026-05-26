import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { CROP_TYPES } from '../data/constants';

export const PlotList: React.FC = () => {
  const { state } = useGameStore();
  const { plots } = state;

  const getPlotStatus = (plot: typeof plots[0]) => {
    const ratio = plot.waterCurrent / plot.waterRequired;
    if (ratio < 0.5) return { text: '严重缺水', color: 'text-red-600', bg: 'bg-red-100' };
    if (ratio < 0.8) return { text: '缺水', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (ratio <= 1.2) return { text: '正常', color: 'text-green-600', bg: 'bg-green-100' };
    if (ratio <= 1.5) return { text: '过量', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { text: '严重过量', color: 'text-purple-600', bg: 'bg-purple-100' };
  };

  return (
    <div className="space-y-3">
      {plots.map((plot) => {
        const cropInfo = CROP_TYPES.find(c => c.name === plot.cropType);
        const status = getPlotStatus(plot);
        const ratio = (plot.waterCurrent / plot.waterRequired) * 100;

        return (
          <div key={plot.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cropInfo?.icon || '🌱'}</span>
                <div>
                  <h4 className="font-medium text-gray-800">{plot.name}</h4>
                  <p className="text-xs text-gray-500">{plot.cropType}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                {status.text}
              </span>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>需水: {plot.waterRequired} 单位</span>
                <span>当前: {plot.waterCurrent} 单位</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    ratio < 50 ? 'bg-red-500' : ratio <= 120 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, ratio)}%` }}
                />
              </div>
            </div>

            {plot.overwateredCount > 0 && (
              <div className="text-xs text-blue-600">
                ⚠️ 过度灌溉次数: {plot.overwateredCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
