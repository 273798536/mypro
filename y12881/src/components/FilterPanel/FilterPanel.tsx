import {
  Layers,
  AlertTriangle,
  CheckCircle,
  Filter,
  X,
  RotateCcw,
  Slice,
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import {
  SPECIES_LIST,
  WATER_LAYER_LABELS,
  RISK_LABELS,
  STATUS_LABELS,
  WaterLayer,
  RiskLevel,
  SampleStatus,
} from '@/types';
import { getRiskColor, getSpeciesColor } from '@/utils/colorUtils';

export default function FilterPanel() {
  const {
    filter,
    section,
    toggleFilterSpecies,
    toggleFilterLayer,
    toggleFilterRisk,
    toggleFilterStatus,
    setCountRange,
    setSection,
    resetFilters,
  } = useSampleStore();

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 overflow-y-auto" style={{ width: 280 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-cyan-glow" />
          <span className="font-display font-semibold text-ocean-50 text-sm">筛选与剖切</span>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-[11px] text-ocean-300 hover:text-cyan-glow transition-colors"
        >
          <RotateCcw size={12} /> 重置
        </button>
      </div>

      <div className="divider-glow" />

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs text-ocean-200">
          <Layers size={13} /> 物种
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SPECIES_LIST.map((sp) => (
            <button
              key={sp}
              onClick={() => toggleFilterSpecies(sp)}
              className={`chip ${filter.species.includes(sp) ? 'chip-active' : ''}`}
              style={{
                borderColor: filter.species.includes(sp) ? getSpeciesColor(sp) : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: getSpeciesColor(sp) }}
              />
              {sp}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs text-ocean-200">
          <Layers size={13} /> 水层
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(WATER_LAYER_LABELS) as WaterLayer[]).map((layer) => (
            <button
              key={layer}
              onClick={() => toggleFilterLayer(layer)}
              className={`chip ${filter.waterLayers.includes(layer) ? 'chip-active' : ''}`}
            >
              {WATER_LAYER_LABELS[layer].split('(')[0]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs text-ocean-200">
          <AlertTriangle size={13} /> 风险等级
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(RISK_LABELS) as RiskLevel[]).map((risk) => (
            <button
              key={risk}
              onClick={() => toggleFilterRisk(risk)}
              className={`chip ${filter.riskLevels.includes(risk) ? 'chip-active' : ''}`}
              style={{
                borderColor: filter.riskLevels.includes(risk) ? getRiskColor(risk) : undefined,
                color: filter.riskLevels.includes(risk) ? getRiskColor(risk) : undefined,
              }}
            >
              {RISK_LABELS[risk]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs text-ocean-200">
          <CheckCircle size={13} /> 复核状态
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STATUS_LABELS) as SampleStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => toggleFilterStatus(status)}
              className={`chip ${filter.statuses.includes(status) ? 'chip-active' : ''}`}
            >
              <span
                className={`badge-status-${status} !py-0 !px-1 mr-1 text-[10px]`}
                style={{ background: 'transparent' }}
              />
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ocean-200">计数范围</span>
          <span className="text-[11px] text-cyan-glow font-mono">
            {filter.countRange[0]} - {filter.countRange[1]}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={2000}
            step={10}
            value={filter.countRange[0]}
            onChange={(e) =>
              setCountRange([Math.min(Number(e.target.value), filter.countRange[1]), filter.countRange[1]])
            }
            className="w-full"
          />
          <input
            type="range"
            min={0}
            max={2000}
            step={10}
            value={filter.countRange[1]}
            onChange={(e) =>
              setCountRange([filter.countRange[0], Math.max(Number(e.target.value), filter.countRange[0])])
            }
            className="w-full"
          />
        </div>
      </div>

      <div className="divider-glow" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-ocean-200">
            <Slice size={13} className="text-cyan-glow" /> 剖切控制
          </div>
          <button
            onClick={() =>
              setSection({
                showSectionPlane: !section.showSectionPlane,
                horizontalY: null,
                verticalX: null,
                verticalZ: null,
              })
            }
            className={`text-[11px] px-2 py-0.5 rounded ${
              section.showSectionPlane
                ? 'bg-cyan-glow/20 text-cyan-glow border border-cyan-glow/40'
                : 'text-ocean-300 hover:text-cyan-glow'
            }`}
          >
            {section.showSectionPlane ? '已启用' : '启用剖切'}
          </button>
        </div>

        {section.showSectionPlane && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ocean-300">水平剖切 (深度)</span>
                {section.horizontalY !== null ? (
                  <button
                    onClick={() => setSection({ horizontalY: null })}
                    className="text-ocean-400 hover:text-crimson-risk"
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <span className="text-ocean-400">未设置</span>
                )}
              </div>
              <input
                type="range"
                min={-15}
                max={18}
                step={0.5}
                value={section.horizontalY ?? 0}
                onChange={(e) => setSection({ horizontalY: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ocean-300">纵向剖切 X</span>
                {section.verticalX !== null ? (
                  <button
                    onClick={() => setSection({ verticalX: null })}
                    className="text-ocean-400 hover:text-crimson-risk"
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <span className="text-ocean-400">未设置</span>
                )}
              </div>
              <input
                type="range"
                min={-40}
                max={40}
                step={1}
                value={section.verticalX ?? 0}
                onChange={(e) => setSection({ verticalX: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ocean-300">纵向剖切 Z</span>
                {section.verticalZ !== null ? (
                  <button
                    onClick={() => setSection({ verticalZ: null })}
                    className="text-ocean-400 hover:text-crimson-risk"
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <span className="text-ocean-400">未设置</span>
                )}
              </div>
              <input
                type="range"
                min={-40}
                max={40}
                step={1}
                value={section.verticalZ ?? 0}
                onChange={(e) => setSection({ verticalZ: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
