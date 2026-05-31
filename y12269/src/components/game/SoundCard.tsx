import { useState } from 'react';
import { Info, Clock, Volume2 } from 'lucide-react';
import { SoundSource } from '../../types';

interface SoundCardProps {
  source: SoundSource;
  currentPeriod: 'day' | 'night';
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
}

export function SoundCard({ source, currentPeriod, onDragStart, compact = false }: SoundCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  const isValidInPeriod = source.validPeriods.includes(currentPeriod);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
          isValidInPeriod
            ? 'bg-white border-gray-200 hover:border-primary-400 hover:shadow-md'
            : 'bg-gray-100 border-gray-200 opacity-60'
        }`}
        draggable={isValidInPeriod}
        onDragStart={onDragStart}
      >
        <span className="text-xl">{source.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800 truncate">{source.name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Volume2 size={10} />
            <span>{source.baseDecibel}dB</span>
          </div>
        </div>
        {!isValidInPeriod && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
            {currentPeriod === 'day' ? '仅夜间' : '仅白天'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`p-4 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 ${
          isValidInPeriod
            ? 'bg-white border-gray-200 hover:border-primary-400 hover:shadow-lg hover:-translate-y-1'
            : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
        }`}
        draggable={isValidInPeriod}
        onDragStart={onDragStart}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{source.icon}</span>
            <div>
              <h4 className="font-semibold text-gray-800">{source.name}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Volume2 size={12} />
                <span className="font-medium">{source.baseDecibel} dB</span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowInfo(!showInfo);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Info size={16} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{source.description}</p>

        <div className="flex items-center gap-2 text-xs">
          <Clock size={12} className="text-gray-400" />
          <div className="flex gap-1">
            {source.validPeriods.includes('day') && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">☀️ 白天</span>
            )}
            {source.validPeriods.includes('night') && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">🌙 夜间</span>
            )}
          </div>
        </div>

        {!isValidInPeriod && (
          <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg">
            ⚠️ 当前时段不适用此声源
          </div>
        )}
      </div>

      {showInfo && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl p-4 z-30 border">
          <h5 className="font-semibold text-gray-800 mb-2">声源详情</h5>
          <div className="space-y-2 text-sm">
            <p><strong>类型：</strong>{source.type}</p>
            <p><strong>分贝：</strong>{source.baseDecibel} dB</p>
            <p><strong>适用时段：</strong>{source.validPeriods.includes('day') ? '白天' : ''}{source.validPeriods.includes('night') ? ' 夜间' : ''}</p>
            <p><strong>说明：</strong>{source.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
