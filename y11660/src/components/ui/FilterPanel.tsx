import { useState } from 'react';
import {
  Filter,
  Calendar,
  TrendingUp,
  Target,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore, useAnomalyStats } from '@/store/useAppStore';
import type { AnomalyType } from '@/types';
import { getAnomalyTypeLabel } from '@/utils/anomalyDetector';

const ANOMALY_TYPES: AnomalyType[] = ['missing_quote', 'spike', 'expiration_mismatch', 'outlier'];

export const FilterPanel = () => {
  const { filters, setFilters, resetFilters, dataPoints } = useAppStore();
  const stats = useAnomalyStats();
  const [expanded, setExpanded] = useState(true);

  const expirationDates = [...new Set(dataPoints.map((p) => p.expirationDate))].sort();
  const allStrikes = dataPoints.map((p) => p.strikePrice);
  const allVols = dataPoints.map((p) => p.impliedVolatility);

  const minStrike = Math.min(...allStrikes);
  const maxStrike = Math.max(...allStrikes);
  const minVol = Math.min(...allVols);
  const maxVol = Math.max(...allVols);

  const handleExpirationToggle = (date: string) => {
    const newDates = filters.expirationDates.includes(date)
      ? filters.expirationDates.filter((d) => d !== date)
      : [...filters.expirationDates, date];
    setFilters({ expirationDates: newDates });
  };

  const handleAnomalyTypeToggle = (type: AnomalyType) => {
    const newTypes = filters.anomalyTypes.includes(type)
      ? filters.anomalyTypes.filter((t) => t !== type)
      : [...filters.anomalyTypes, type];
    setFilters({ anomalyTypes: newTypes });
  };

  const handleStrikeChange = (value: number, index: 0 | 1) => {
    const newRange: [number, number] = [...filters.strikePriceRange] as [number, number];
    newRange[index] = value;
    setFilters({ strikePriceRange: newRange });
  };

  const handleVolatilityChange = (value: number, index: 0 | 1) => {
    const newRange: [number, number] = [...filters.volatilityRange] as [number, number];
    newRange[index] = value;
    setFilters({ volatilityRange: newRange });
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-cyan-400" />
          <span className="font-semibold text-white">筛选条件</span>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Target size={14} />
                执行价范围
              </label>
              <span className="text-xs text-slate-500">
                {filters.strikePriceRange[0].toLocaleString()} - {filters.strikePriceRange[1].toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={minStrike}
                max={maxStrike}
                value={filters.strikePriceRange[0]}
                onChange={(e) => handleStrikeChange(Number(e.target.value), 0)}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <input
                type="range"
                min={minStrike}
                max={maxStrike}
                value={filters.strikePriceRange[1]}
                onChange={(e) => handleStrikeChange(Number(e.target.value), 1)}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <TrendingUp size={14} />
                波动率范围
              </label>
              <span className="text-xs text-slate-500">
                {(filters.volatilityRange[0] * 100).toFixed(1)}% - {(filters.volatilityRange[1] * 100).toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={minVol}
                max={maxVol}
                step={0.01}
                value={filters.volatilityRange[0]}
                onChange={(e) => handleVolatilityChange(Number(e.target.value), 0)}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <input
                type="range"
                min={minVol}
                max={maxVol}
                step={0.01}
                value={filters.volatilityRange[1]}
                onChange={(e) => handleVolatilityChange(Number(e.target.value), 1)}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Calendar size={14} />
              到期日 ({filters.expirationDates.length}/{expirationDates.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {expirationDates.map((date) => {
                const isSelected = filters.expirationDates.includes(date);
                return (
                  <button
                    key={date}
                    onClick={() => handleExpirationToggle(date)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      isSelected
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {date.slice(5)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <AlertCircle size={14} />
              异常类型筛选
            </label>
            <div className="space-y-2">
              {ANOMALY_TYPES.map((type) => {
                const count = {
                  missing_quote: stats.missingQuotes,
                  spike: stats.spikes,
                  expiration_mismatch: stats.expirationMismatches,
                  outlier: stats.outliers,
                }[type];

                return (
                  <label
                    key={type}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-700/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.anomalyTypes.includes(type)}
                        onChange={() => handleAnomalyTypeToggle(type)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">{getAnomalyTypeLabel(type)}</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>

            <label className="flex items-center justify-between mt-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.showAnomaliesOnly}
                  onChange={(e) => setFilters({ showAnomaliesOnly: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="text-sm text-rose-400">仅显示异常点</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                {stats.withAnomalies}
              </span>
            </label>
          </div>

          <button
            onClick={resetFilters}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium text-slate-300 transition-colors"
          >
            <RefreshCw size={14} />
            重置筛选
          </button>
        </div>
      )}
    </div>
  );
};
