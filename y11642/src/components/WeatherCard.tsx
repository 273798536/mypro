import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Weather } from '../types';

export const WeatherCard: React.FC = () => {
  const { state } = useGameStore();
  const { currentWeather, phase } = state;

  const getWeatherBg = (type: string) => {
    switch (type) {
      case 'sunny':
        return 'from-yellow-400 to-orange-400';
      case 'cloudy':
        return 'from-gray-400 to-gray-500';
      case 'rainy':
        return 'from-blue-400 to-blue-600';
      case 'windy':
        return 'from-cyan-400 to-teal-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getWeatherBg(currentWeather.type)} rounded-xl p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1">今日天气</h3>
          <p className="text-sm opacity-90">{currentWeather.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm">蒸发率:</span>
            <span className="font-bold">{Math.round(currentWeather.evaporationRate * 100)}%</span>
          </div>
        </div>
        <div className="text-5xl">{currentWeather.icon}</div>
      </div>
      
      {currentWeather.evaporationRate > 0.2 && phase === 'playing' && (
        <div className="mt-3 bg-white/20 rounded-lg p-2 text-sm">
          ⚠️ 蒸发量较大，请注意调整灌溉策略
        </div>
      )}
      
      {currentWeather.type === 'rainy' && phase === 'playing' && (
        <div className="mt-3 bg-white/20 rounded-lg p-2 text-sm">
          🌧️ 雨天无需灌溉，关闭阀门节约用水
        </div>
      )}
    </div>
  );
};
