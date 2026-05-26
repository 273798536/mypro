import React from 'react';
import { WeatherCard } from './WeatherCard';
import { PlotList } from './PlotList';
import { AnomalyList } from './AnomalyList';

export const InfoPanel: React.FC = () => {
  return (
    <div className="space-y-4">
      <WeatherCard />
      
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">🌱 地块状态</h3>
        <PlotList />
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">⚠️ 异常记录</h3>
        <AnomalyList />
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <p className="font-medium mb-1">📚 数据来源说明</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>灌溉算法: BFS广度优先搜索水流路径</li>
          <li>干旱阈值: 水量低于需水量50%</li>
          <li>过度灌溉: 水量超过需水量120%</li>
          <li>蒸发模型: 天气类型 × 用水量</li>
        </ul>
      </div>
    </div>
  );
};
