import React from 'react';
import { CloudRain, Wind, Waves, ThermometerSun, ChevronDown, ChevronUp } from 'lucide-react';
import { useVersionStore } from '@/store/useVersionStore';
import { weatherLevelDescriptions } from '@/utils/mockData';

interface WeatherEvidenceProps {
  expanded: boolean;
  onToggle: () => void;
}

export const WeatherEvidence: React.FC<WeatherEvidenceProps> = ({ expanded, onToggle }) => {
  const { weatherEvidence, weatherLevel } = useVersionStore();
  const weatherInfo = weatherLevelDescriptions[weatherLevel];

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CloudRain size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-slate-200">天气证据</span>
          <span
            className="px-2 py-0.5 text-[10px] font-bold rounded text-white"
            style={{ backgroundColor: weatherInfo.color }}
          >
            {weatherLevel}级 · {weatherInfo.name}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-slate-900/50">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <Wind size={10} />
                风力
              </div>
              <div className="font-mono text-sm text-slate-200">{weatherEvidence.windForce}级</div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <Waves size={10} />
                浪高
              </div>
              <div className="font-mono text-sm text-slate-200">{weatherEvidence.waveHeight}m</div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                <ThermometerSun size={10} />
                影响系数
              </div>
              <div className="font-mono text-sm text-amber-400">×{weatherEvidence.influenceFactor.toFixed(2)}</div>
            </div>
          </div>

          <div className="p-2 bg-blue-900/20 border border-blue-700/50 rounded">
            <div className="text-[10px] text-blue-400 font-medium mb-1">证据说明</div>
            <div className="text-[11px] text-slate-300 leading-relaxed">
              当日天气等级为{weatherLevel}级（{weatherInfo.name}），风力{weatherEvidence.windForce}级，浪高{weatherEvidence.waveHeight}米。
              考虑天气影响后，GM值修正系数为×{weatherEvidence.influenceFactor.toFixed(2)}。
              此数据已作为补充证据关联至本次稳性计算结果，用于模型与货舱格结论不一致时的判定参考。
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            记录时间: {new Date(weatherEvidence.recordedAt).toLocaleString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  );
};
