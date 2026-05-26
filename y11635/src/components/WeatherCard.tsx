import React from 'react';
import { Sun, CloudRain, CloudDrizzle, CloudLightning, CloudFog } from 'lucide-react';
import { WeatherCard as WeatherCardType } from '../types/game';

interface WeatherCardProps {
  weather: WeatherCardType;
  inflow: number;
}

const iconMap: Record<string, React.ReactNode> = {
  Sun: <Sun className="w-8 h-8" />,
  CloudRain: <CloudRain className="w-8 h-8" />,
  CloudDrizzle: <CloudDrizzle className="w-8 h-8" />,
  CloudLightning: <CloudLightning className="w-8 h-8" />,
  CloudFog: <CloudFog className="w-8 h-8" />,
};

export function WeatherCard({ weather, inflow }: WeatherCardProps) {
  const isSevere = weather.type === 'storm' || weather.type === 'heavyRain';

  return (
    <div
      className={`rounded-xl p-4 border-2 transition-all duration-300 ${
        isSevere
          ? 'animate-pulse border-red-500/50 bg-red-900/20'
          : 'border-slate-600 bg-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider">天气状况</span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${weather.color}30`, color: weather.color }}
        >
          {weather.name}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div style={{ color: weather.color }}>
          {iconMap[weather.icon] || <Sun className="w-8 h-8" />}
        </div>
        <div>
          <div className="text-xs text-slate-400">上游来水</div>
          <div className="text-xl font-mono font-bold text-cyan-400">
            {inflow} <span className="text-sm text-slate-400">单位</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">{weather.description}</p>

      {isSevere && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-xs text-red-400 flex items-center gap-1">
            ⚠️ 紧急情况！需要立即开闸泄洪！
          </p>
        </div>
      )}
    </div>
  );
}
