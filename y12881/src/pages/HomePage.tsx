import { useState } from 'react';
import OceanScene from '@/components/ThreeScene/OceanScene';
import FilterPanel from '@/components/FilterPanel/FilterPanel';
import SampleDetail from '@/components/DetailPanel/SampleDetail';
import Map2D from '@/components/MapOverview/Map2D';
import VersionTimeline from '@/components/Timeline/VersionTimeline';
import { useUIStore } from '@/store/useUISTore';
import { calculateCounts, countBySpecies, countByLayer, formatNumber } from '@/utils/counter';
import { useSampleStore } from '@/store/useSampleStore';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';
import { ChevronLeft, ChevronRight, Layers, GitCompare, Info } from 'lucide-react';
import { getSpeciesColor } from '@/utils/colorUtils';

export default function HomePage() {
  const {
    showFilterPanel,
    showDetailPanel,
    showMapOverview,
    showTimeline,
    toggleFilterPanel,
    toggleDetailPanel,
    toggleMapOverview,
    toggleTimeline,
  } = useUIStore();

  const { samples, getFilteredSamples } = useSampleStore();
  const filtered = getFilteredSamples();
  const summary = calculateCounts(filtered, INITIAL_WATER_QUALITIES);
  const bySpecies = countBySpecies(filtered);
  const byLayer = countByLayer(filtered);

  const [showStats, setShowStats] = useState(true);

  return (
    <div className="flex-1 flex relative overflow-hidden">
      <div className="absolute inset-0 ocean-noise z-0" />

      <button
        onClick={toggleFilterPanel}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 glass-panel rounded-r-lg px-1.5 py-3 text-ocean-300 hover:text-cyan-glow transition-all ${
          showFilterPanel ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <ChevronRight size={18} />
      </button>

      {showFilterPanel && (
        <div className="relative z-10 h-full p-3">
          <button
            onClick={toggleFilterPanel}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-20 glass-panel rounded-r-lg px-1 py-3 text-ocean-400 hover:text-cyan-glow"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col gap-3 h-full">
            <FilterPanel />
            {showTimeline && <VersionTimeline />}
          </div>
        </div>
      )}

      <div className="flex-1 relative canvas-container">
        <OceanScene />

        <div className="absolute top-3 left-3 z-10 flex flex-col gap-3">
          {showMapOverview && (
            <div className="relative">
              <button
                onClick={toggleMapOverview}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ocean-900 border border-ocean-700 text-ocean-400 hover:text-cyan-glow text-xs z-10 flex items-center justify-center"
              >
                ✕
              </button>
              <Map2D />
            </div>
          )}
          {!showMapOverview && (
            <button
              onClick={toggleMapOverview}
              className="glass-panel px-3 py-2 text-xs text-ocean-300 hover:text-cyan-glow flex items-center gap-1.5"
            >
              <Layers size={13} /> 显示地图
            </button>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="glass-panel px-3 py-2 text-xs text-ocean-300 hover:text-cyan-glow flex items-center gap-1.5"
          >
            <Info size={13} /> 统计
          </button>
          <button
            onClick={toggleTimeline}
            className={`glass-panel px-3 py-2 text-xs flex items-center gap-1.5 ${
              showTimeline ? 'text-cyan-glow border-cyan-glow/30' : 'text-ocean-300 hover:text-cyan-glow'
            }`}
          >
            <GitCompare size={13} /> 版本
          </button>
        </div>

        {showStats && (
          <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between gap-3 pointer-events-none">
            <div className="glass-panel p-3 pointer-events-auto" style={{ minWidth: 220 }}>
              <div className="text-[10px] text-ocean-400 uppercase tracking-wider mb-2">样本统计</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-ocean-400 text-[10px]">当前显示</div>
                  <div className="font-display font-bold text-cyan-glow text-lg">
                    {filtered.length}
                    <span className="text-[10px] text-ocean-400 ml-1">/{samples.length}</span>
                  </div>
                </div>
                <div>
                  <div className="text-ocean-400 text-[10px]">估算总数</div>
                  <div className="font-display font-bold text-ocean-50 text-lg">
                    {formatNumber(summary.totalCount)}
                  </div>
                </div>
                <div>
                  <div className="text-ocean-400 text-[10px]">高可信</div>
                  <div className="text-ocean-200 font-semibold">{formatNumber(summary.highConfidenceCount)}</div>
                </div>
                <div>
                  <div className="text-ocean-400 text-[10px]">数据缺口</div>
                  <div className={`font-semibold ${summary.gaps.length > 0 ? 'text-amber-risk' : 'text-cyan-glow'}`}>
                    {summary.gaps.length} 项
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-3 pointer-events-auto" style={{ minWidth: 200 }}>
              <div className="text-[10px] text-ocean-400 uppercase tracking-wider mb-2">水层分布</div>
              <div className="space-y-1.5">
                {Object.entries(byLayer).map(([layer, count]) => {
                  const total = Object.values(byLayer).reduce((a, b) => a + b, 0) || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={layer}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-ocean-300">
                          {layer === 'surface' ? '表层' : layer === 'middle' ? '中层' : '深层'}
                        </span>
                        <span className="text-ocean-100 font-medium">{formatNumber(count)}</span>
                      </div>
                      <div className="h-1.5 bg-ocean-900 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              layer === 'surface' ? '#2E8FB4' : layer === 'middle' ? '#154E69' : '#0F2F44',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel p-3 pointer-events-auto" style={{ minWidth: 220, maxWidth: 280 }}>
              <div className="text-[10px] text-ocean-400 uppercase tracking-wider mb-2">物种分布 TOP</div>
              <div className="space-y-1.5">
                {Object.entries(bySpecies)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([species, count]) => {
                    const total = Object.values(bySpecies).reduce((a, b) => a + b, 0) || 1;
                    const pct = (count / total) * 100;
                    return (
                      <div key={species}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-ocean-300 flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getSpeciesColor(species) }}
                            />
                            {species.length > 6 ? species.slice(0, 6) + '..' : species}
                          </span>
                          <span className="text-ocean-100 font-medium">{formatNumber(count)}</span>
                        </div>
                        <div className="h-1.5 bg-ocean-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: getSpeciesColor(species) }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 pointer-events-none" style={{ display: showStats ? 'none' : undefined }}>
          <div className="glass-panel px-3 py-2 text-[10px] text-ocean-400 font-mono">
            拖拽旋转 · 滚轮缩放 · 点击选中 · 右键平移
          </div>
        </div>
      </div>

      {showDetailPanel && (
        <div className="relative z-10 h-full p-3">
          <button
            onClick={toggleDetailPanel}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20 glass-panel rounded-l-lg px-1 py-3 text-ocean-400 hover:text-cyan-glow"
          >
            <ChevronRight size={18} />
          </button>
          <div className="h-full">
            <SampleDetail />
          </div>
        </div>
      )}

      {!showDetailPanel && (
        <button
          onClick={toggleDetailPanel}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 glass-panel rounded-l-lg px-1.5 py-3 text-ocean-300 hover:text-cyan-glow"
        >
          <ChevronLeft size={18} />
        </button>
      )}
    </div>
  );
}
