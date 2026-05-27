import React from 'react';
import {
  Layers,
  Map,
  Thermometer,
  Snowflake,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { useFilterStore } from '@/store/useFilterStore';
import { slopes } from '@/data/slopes';
import { RangeSlider, SingleSlider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { difficultyLabels, difficultyColors } from '@/utils/color';
import type { RiskLevel } from '@/types';
import { riskColors, riskLabels } from '@/utils/color';

export const Sidebar: React.FC = () => {
  const {
    selectedSlopes,
    slopeRange,
    snowDepthRange,
    riskLevels,
    showHeatmap,
    heatmapOpacity,
    showSlopeColors,
    showRiskMarkers,
    setSelectedSlopes,
    setSlopeRange,
    setSnowDepthRange,
    setRiskLevels,
    setShowHeatmap,
    setHeatmapOpacity,
    setShowSlopeColors,
    setShowRiskMarkers,
    resetFilters,
  } = useFilterStore();

  const toggleSlope = (slopeId: string) => {
    if (selectedSlopes.includes(slopeId)) {
      setSelectedSlopes(selectedSlopes.filter((id) => id !== slopeId));
    } else {
      setSelectedSlopes([...selectedSlopes, slopeId]);
    }
  };

  const toggleRiskLevel = (level: RiskLevel) => {
    if (riskLevels.includes(level)) {
      setRiskLevels(riskLevels.filter((l) => l !== level));
    } else {
      setRiskLevels([...riskLevels, level]);
    }
  };

  return (
    <aside className="w-80 bg-slate-900/95 backdrop-blur-md border-r border-white/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            筛选条件
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            重置
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Map className="w-3.5 h-3.5" />
            雪道选择
          </h3>
          <div className="space-y-2">
            {slopes.map((slope) => (
              <label
                key={slope.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSlopes.includes(slope.id) || selectedSlopes.length === 0}
                  onChange={() => toggleSlope(slope.id)}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500"
                />
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: difficultyColors[slope.difficulty] }}
                />
                <span className="text-white/80 text-sm flex-1">{slope.name}</span>
                <span className="text-white/40 text-xs">
                  {difficultyLabels[slope.difficulty]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5" />
            坡度范围
          </h3>
          <RangeSlider
            min={0}
            max={45}
            value={slopeRange}
            onChange={setSlopeRange}
            unit="°"
          />
        </div>

        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Snowflake className="w-3.5 h-3.5" />
            积雪深度
          </h3>
          <RangeSlider
            min={0}
            max={100}
            value={snowDepthRange}
            onChange={setSnowDepthRange}
            unit="cm"
          />
        </div>

        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            风险等级
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  riskLevels.includes(level)
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
                style={{
                  borderLeft: `3px solid ${riskColors[level]}`,
                }}
              >
                {riskLabels[level]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            显示选项
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-2">
                {showSlopeColors ? (
                  <Eye className="w-4 h-4 text-cyan-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/30" />
                )}
                <span className="text-white/80 text-sm">坡度着色</span>
              </div>
              <input
                type="checkbox"
                checked={showSlopeColors}
                onChange={(e) => setShowSlopeColors(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-2">
                {showHeatmap ? (
                  <Eye className="w-4 h-4 text-orange-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/30" />
                )}
                <span className="text-white/80 text-sm">人流热力图</span>
              </div>
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500"
              />
            </label>

            {showHeatmap && (
              <div className="pl-6">
                <SingleSlider
                  min={0}
                  max={100}
                  value={Math.round(heatmapOpacity * 100)}
                  onChange={(v) => setHeatmapOpacity(v / 100)}
                  label="热力透明度"
                  unit="%"
                />
              </div>
            )}

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-2">
                {showRiskMarkers ? (
                  <Eye className="w-4 h-4 text-red-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/30" />
                )}
                <span className="text-white/80 text-sm">风险标记</span>
              </div>
              <input
                type="checkbox"
                checked={showRiskMarkers}
                onChange={(e) => setShowRiskMarkers(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-white/80 text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            图例说明
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2EC4B6' }} />
              <span className="text-white/60">低坡度 (0-12°)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFE66D' }} />
              <span className="text-white/60">中坡度 (12-20°)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF9F1C' }} />
              <span className="text-white/60">高坡度 (20-30°)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E71D36' }} />
              <span className="text-white/60">极陡坡 (30°+)</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
