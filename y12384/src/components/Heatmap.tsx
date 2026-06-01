import React from 'react';
import { generateHeatmapData } from '../data/mockData';

export const Heatmap: React.FC = () => {
  const data = generateHeatmapData();
  const days = ['周一', '周二', '周三', '周四', '周五'];
  const hours = ['08:00', '08:30', '09:00', '09:30', '10:00'];

  const getColor = (value: number) => {
    if (value === 0) return 'bg-surface-100';
    if (value <= 2) return 'bg-warning-200';
    if (value <= 4) return 'bg-warning-400';
    return 'bg-danger-500';
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
        冲突热力图（本周）
      </h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="flex mb-2">
            <div className="w-16" />
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-surface-500 font-medium"
              >
                {hour}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-16 text-sm text-surface-600 font-medium">
                {day}
              </div>
              {hours.map((hour) => {
                const cell = data.find(
                  (d) => d.day === day && d.hour === hour
                );
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`flex-1 h-10 mx-0.5 rounded ${getColor(
                      cell?.value || 0
                    )} cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all`}
                    title={`${day} ${hour}: ${cell?.value || 0} 个冲突`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end mt-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-surface-100" />
          <span className="text-xs text-surface-500">无冲突</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning-200" />
          <span className="text-xs text-surface-500">轻微</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning-400" />
          <span className="text-xs text-surface-500">中等</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-danger-500" />
          <span className="text-xs text-surface-500">严重</span>
        </div>
      </div>
    </div>
  );
};
