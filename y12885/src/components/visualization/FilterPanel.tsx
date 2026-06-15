import { useState } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Ship,
  Calendar,
  Ruler,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { SHIP_LIST, DATA_QUALITY_LABELS, ANOMALY_TYPE_LABELS, DataQuality, AnomalyType } from '../../types';
import { formatDateTime } from '../../mock/data';

export default function FilterPanel() {
  const { filters, setFilters, resetFilters, trackPoints } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ship: true,
    time: false,
    depth: false,
    quality: false,
    anomaly: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleShipToggle = (shipId: string) => {
    const newShipIds = filters.shipIds.includes(shipId)
      ? filters.shipIds.filter(id => id !== shipId)
      : [...filters.shipIds, shipId];
    setFilters({ shipIds: newShipIds });
  };

  const handleQualityToggle = (quality: DataQuality) => {
    const newQualities = filters.dataQualities.includes(quality)
      ? filters.dataQualities.filter(q => q !== quality)
      : [...filters.dataQualities, quality];
    setFilters({ dataQualities: newQualities });
  };

  const handleAnomalyToggle = (type: AnomalyType) => {
    const newTypes = filters.anomalyTypes.includes(type)
      ? filters.anomalyTypes.filter(t => t !== type)
      : [...filters.anomalyTypes, type];
    setFilters({ anomalyTypes: newTypes });
  };

  const timeRange = trackPoints.length > 0 ? {
    min: Math.min(...trackPoints.map(p => p.timestamp)),
    max: Math.max(...trackPoints.map(p => p.timestamp)),
  } : null;

  const depthRange = trackPoints.length > 0 ? {
    min: Math.min(...trackPoints.map(p => p.depth)),
    max: Math.max(...trackPoints.map(p => p.depth)),
  } : { min: -10, max: 100 };

  const activeFiltersCount = [
    filters.shipIds.length > 0,
    filters.timeRange !== null,
    filters.depthRange[0] !== -10 || filters.depthRange[1] !== 100,
    filters.dataQualities.length > 0,
    filters.anomalyTypes.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-72 glass-panel h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-ocean-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-ocean-300" />
          <h3 className="font-medium text-ocean-100">筛选条件</h3>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-ocean-500 text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-ocean-400 hover:text-ocean-200 transition-colors"
          >
            重置
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="border border-ocean-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('ship')}
            className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-ocean-300" />
              <span className="text-sm text-ocean-100">船舶</span>
              {filters.shipIds.length > 0 && (
                <span className="text-xs text-ocean-400">({filters.shipIds.length})</span>
              )}
            </div>
            {expandedSections.ship ? (
              <ChevronUp className="w-4 h-4 text-ocean-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ocean-400" />
            )}
          </button>
          {expandedSections.ship && (
            <div className="p-3 pt-0 space-y-2 border-t border-ocean-700/30">
              {SHIP_LIST.map(ship => (
                <label key={ship.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.shipIds.includes(ship.id)}
                    onChange={() => handleShipToggle(ship.id)}
                    className="w-4 h-4 rounded border-ocean-600 bg-ocean-900 text-ocean-500 focus:ring-ocean-500"
                  />
                  <span className="text-sm text-ocean-200 group-hover:text-ocean-100">
                    {ship.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border border-ocean-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('time')}
            className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ocean-300" />
              <span className="text-sm text-ocean-100">时间范围</span>
            </div>
            {expandedSections.time ? (
              <ChevronUp className="w-4 h-4 text-ocean-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ocean-400" />
            )}
          </button>
          {expandedSections.time && timeRange && (
            <div className="p-3 pt-0 space-y-3 border-t border-ocean-700/30">
              <div>
                <label className="text-xs text-ocean-400 block mb-1">开始时间</label>
                <input
                  type="datetime-local"
                  className="input-field text-xs"
                  value={filters.timeRange ? formatDateTime(filters.timeRange[0]).slice(0, 16) : ''}
                  onChange={(e) => {
                    const start = new Date(e.target.value).getTime();
                    const end = filters.timeRange ? filters.timeRange[1] : timeRange.max;
                    setFilters({ timeRange: [start, end] });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-ocean-400 block mb-1">结束时间</label>
                <input
                  type="datetime-local"
                  className="input-field text-xs"
                  value={filters.timeRange ? formatDateTime(filters.timeRange[1]).slice(0, 16) : ''}
                  onChange={(e) => {
                    const end = new Date(e.target.value).getTime();
                    const start = filters.timeRange ? filters.timeRange[0] : timeRange.min;
                    setFilters({ timeRange: [start, end] });
                  }}
                />
              </div>
              <p className="text-xs text-ocean-500">
                数据范围: {formatDateTime(timeRange.min)} - {formatDateTime(timeRange.max)}
              </p>
            </div>
          )}
        </div>

        <div className="border border-ocean-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('depth')}
            className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-ocean-300" />
              <span className="text-sm text-ocean-100">深度范围</span>
            </div>
            {expandedSections.depth ? (
              <ChevronUp className="w-4 h-4 text-ocean-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ocean-400" />
            )}
          </button>
          {expandedSections.depth && (
            <div className="p-3 pt-0 space-y-3 border-t border-ocean-700/30">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-ocean-400 block mb-1">最小 (m)</label>
                  <input
                    type="number"
                    className="input-field text-xs"
                    value={filters.depthRange[0]}
                    onChange={(e) => setFilters({
                      depthRange: [Number(e.target.value), filters.depthRange[1]]
                    })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-ocean-400 block mb-1">最大 (m)</label>
                  <input
                    type="number"
                    className="input-field text-xs"
                    value={filters.depthRange[1]}
                    onChange={(e) => setFilters({
                      depthRange: [filters.depthRange[0], Number(e.target.value)]
                    })}
                  />
                </div>
              </div>
              <input
                type="range"
                min={depthRange.min}
                max={depthRange.max}
                value={filters.depthRange[1]}
                onChange={(e) => setFilters({
                  depthRange: [filters.depthRange[0], Number(e.target.value)]
                })}
                className="w-full accent-ocean-500"
              />
              <p className="text-xs text-ocean-500">
                数据范围: {depthRange.min.toFixed(1)}m - {depthRange.max.toFixed(1)}m
              </p>
            </div>
          )}
        </div>

        <div className="border border-ocean-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('quality')}
            className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-ocean-300" />
              <span className="text-sm text-ocean-100">数据质量</span>
              {filters.dataQualities.length > 0 && (
                <span className="text-xs text-ocean-400">({filters.dataQualities.length})</span>
              )}
            </div>
            {expandedSections.quality ? (
              <ChevronUp className="w-4 h-4 text-ocean-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ocean-400" />
            )}
          </button>
          {expandedSections.quality && (
            <div className="p-3 pt-0 space-y-2 border-t border-ocean-700/30">
              {Object.entries(DATA_QUALITY_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.dataQualities.includes(value as DataQuality)}
                    onChange={() => handleQualityToggle(value as DataQuality)}
                    className="w-4 h-4 rounded border-ocean-600 bg-ocean-900 text-ocean-500 focus:ring-ocean-500"
                  />
                  <span className="text-sm text-ocean-200 group-hover:text-ocean-100">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border border-ocean-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('anomaly')}
            className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-ocean-300" />
              <span className="text-sm text-ocean-100">异常类型</span>
              {filters.anomalyTypes.length > 0 && (
                <span className="text-xs text-ocean-400">({filters.anomalyTypes.length})</span>
              )}
            </div>
            {expandedSections.anomaly ? (
              <ChevronUp className="w-4 h-4 text-ocean-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ocean-400" />
            )}
          </button>
          {expandedSections.anomaly && (
            <div className="p-3 pt-0 space-y-2 border-t border-ocean-700/30">
              {Object.entries(ANOMALY_TYPE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.anomalyTypes.includes(value as AnomalyType)}
                    onChange={() => handleAnomalyToggle(value as AnomalyType)}
                    className="w-4 h-4 rounded border-ocean-600 bg-ocean-900 text-ocean-500 focus:ring-ocean-500"
                  />
                  <span className="text-sm text-ocean-200 group-hover:text-ocean-100">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
