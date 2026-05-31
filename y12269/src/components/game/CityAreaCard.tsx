import { useState } from 'react';
import { X, Volume2, Info } from 'lucide-react';
import { CityArea, PlacedSource, SoundSource } from '../../types';
import { soundSources } from '../../data/soundSources';
import { useGameStore } from '../../store/gameStore';
import { getThreshold, formatDecibel } from '../../utils/decibel';
import { getRiskTextColor } from '../../utils/riskAnalysis';

interface CityAreaCardProps {
  area: CityArea;
  placedSources: PlacedSource[];
  currentDb: number;
  currentPeriod: 'day' | 'night';
  mood: number;
  onDrop?: (sourceId: string) => void;
  isHighlighted?: boolean;
}

const areaTypeColors: Record<string, string> = {
  residential: 'bg-blue-100 border-blue-300',
  commercial: 'bg-yellow-100 border-yellow-300',
  industrial: 'bg-gray-200 border-gray-400',
  park: 'bg-green-100 border-green-300',
};

const areaTypeLabels: Record<string, string> = {
  residential: '居民区',
  commercial: '商业区',
  industrial: '工业区',
  park: '公园',
};

export function CityAreaCard({
  area,
  placedSources,
  currentDb,
  currentPeriod,
  mood,
  onDrop,
  isHighlighted,
}: CityAreaCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const removeSource = useGameStore((state) => state.removeSource);

  const threshold = getThreshold(area, currentPeriod);
  const isOverThreshold = currentDb > threshold;
  const excessDb = currentDb - threshold;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const sourceId = e.dataTransfer.getData('sourceId');
    if (sourceId && onDrop) {
      onDrop(sourceId);
    }
  };

  const getMoodColor = (value: number) => {
    if (value >= 70) return 'text-green-600';
    if (value >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMoodEmoji = (value: number) => {
    if (value >= 70) return '😊';
    if (value >= 40) return '😐';
    return '😟';
  };

  const getDbColor = (db: number, threshold: number) => {
    if (db <= threshold) return 'text-green-600';
    if (db <= threshold + 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${areaTypeColors[area.type]} ${
        isDragOver ? 'ring-2 ring-primary-500 scale-105' : ''
      } ${isHighlighted ? 'ring-2 ring-eco-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 bg-white/50 px-2 py-0.5 rounded">
            {areaTypeLabels[area.type]}
          </span>
          <h4 className="font-semibold text-gray-800 text-sm">{area.name}</h4>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 hover:bg-white/50 rounded transition-colors"
        >
          <Info size={14} className="text-gray-500" />
        </button>
      </div>

      {showInfo && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-3 z-20 w-full text-xs border">
          <p className="mb-1"><strong>敏感度：</strong>{area.sensitivity}/5</p>
          <p><strong>噪声阈值：</strong>白天{area.dayThreshold}dB / 夜间{area.nightThreshold}dB</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-1">
          <Volume2 size={14} className={getDbColor(currentDb, threshold)} />
          <span className={`font-bold ${getDbColor(currentDb, threshold)}`}>
            {formatDecibel(currentDb)}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          阈值: {threshold}dB
          {isOverThreshold && (
            <span className="text-red-500 ml-1">
              (+{excessDb.toFixed(1)})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <span>{getMoodEmoji(mood)}</span>
          <span className={`font-medium ${getMoodColor(mood)}`}>
            {mood}%
          </span>
        </div>
        <span className="text-xs text-gray-500">满意度</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 min-h-8">
        {placedSources.map((ps) => {
          const source = soundSources.find((s) => s.id === ps.sourceId);
          if (!source) return null;
          return (
            <div
              key={ps.id}
              className="inline-flex items-center gap-1 bg-white/80 px-2 py-1 rounded text-xs group"
            >
              <span>{source.icon}</span>
              <span className="max-w-16 truncate">{source.name}</span>
              {ps.placedByPlayer && (
                <button
                  onClick={() => removeSource(ps.id)}
                  className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-500 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isDragOver && (
        <div className="absolute inset-0 bg-primary-500/10 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="text-primary-600 font-medium text-sm">放置声源</span>
        </div>
      )}
    </div>
  );
}
