import { Layers, Scissors, Filter, Fish, Droplets, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { fishSpeciesList, fishingSpots, waterQualityLevelMap } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  className?: string;
}

export function Toolbar({ className }: ToolbarProps) {
  const {
    filters,
    clipping,
    setFishSpeciesFilter,
    setSpotFilter,
    setWaterQualityFilter,
    setClippingEnabled,
    setClippingMode,
    setClippingHorizontal,
    setClippingVertical,
  } = useAppStore();

  const toggleFishSpecies = (species: string) => {
    const current = filters.fishSpecies;
    if (current.includes(species)) {
      setFishSpeciesFilter(current.filter((s) => s !== species));
    } else {
      setFishSpeciesFilter([...current, species]);
    }
  };

  const toggleSpot = (spotId: string) => {
    const current = filters.spotIds;
    if (current.includes(spotId)) {
      setSpotFilter(current.filter((id) => id !== spotId));
    } else {
      setSpotFilter([...current, spotId]);
    }
  };

  const toggleWaterQuality = (level: string) => {
    const current = filters.waterQualityLevel;
    if (current.includes(level)) {
      setWaterQualityFilter(current.filter((l) => l !== level));
    } else {
      setWaterQualityFilter([...current, level]);
    }
  };

  return (
    <div
      className={cn(
        'absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10',
        className
      )}
    >
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-3 text-slate-200">
          <Filter size={16} className="text-cyan-400" />
          <span className="text-sm font-medium">筛选</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Fish size={12} />
              鱼种
            </div>
            <div className="flex flex-wrap gap-1">
              {fishSpeciesList.map((species) => (
                <button
                  key={species}
                  onClick={() => toggleFishSpecies(species)}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md transition-all',
                    filters.fishSpecies.includes(species)
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  )}
                >
                  {species}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Layers size={12} />
              渔点
            </div>
            <div className="flex flex-wrap gap-1">
              {fishingSpots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => toggleSpot(spot.id)}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md transition-all',
                    filters.spotIds.includes(spot.id)
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  )}
                >
                  {spot.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Droplets size={12} />
              水质等级
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(waterQualityLevelMap).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => toggleWaterQuality(key)}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md transition-all flex items-center gap-1',
                    filters.waterQualityLevel.includes(key)
                      ? 'border border-opacity-50'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  )}
                  style={
                    filters.waterQualityLevel.includes(key)
                      ? {
                          backgroundColor: `${value.color}30`,
                          color: value.color,
                          borderColor: `${value.color}50`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: value.color }}
                  />
                  {value.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 p-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-3 text-slate-200">
          <Scissors size={16} className="text-orange-400" />
          <span className="text-sm font-medium">剖切</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">启用剖切</span>
            <button
              onClick={() => setClippingEnabled(!clipping.enabled)}
              className={cn(
                'w-10 h-5 rounded-full transition-all relative',
                clipping.enabled ? 'bg-cyan-500' : 'bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  clipping.enabled ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setClippingMode('horizontal')}
                className={cn(
                  'flex-1 px-2 py-1 text-xs rounded-md transition-all',
                  clipping.mode === 'horizontal' || clipping.mode === 'both'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                )}
              >
                水平
              </button>
              <button
                onClick={() => setClippingMode('vertical')}
                className={cn(
                  'flex-1 px-2 py-1 text-xs rounded-md transition-all',
                  clipping.mode === 'vertical' || clipping.mode === 'both'
                    ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                )}
              >
                垂直
              </button>
              <button
                onClick={() => setClippingMode('both')}
                className={cn(
                  'flex-1 px-2 py-1 text-xs rounded-md transition-all',
                  clipping.mode === 'both'
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                )}
              >
                全部
              </button>
            </div>

            {(clipping.mode === 'horizontal' || clipping.mode === 'both') && (
              <div>
                <div className="text-xs text-slate-400 mb-1">水平高度: {clipping.horizontal.toFixed(1)}</div>
                <input
                  type="range"
                  min="-3"
                  max="2"
                  step="0.1"
                  value={clipping.horizontal}
                  onChange={(e) => setClippingHorizontal(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}

            {(clipping.mode === 'vertical' || clipping.mode === 'both') && (
              <div>
                <div className="text-xs text-slate-400 mb-1">垂直位置: {clipping.vertical.toFixed(1)}</div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={clipping.vertical}
                  onChange={(e) => setClippingVertical(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
