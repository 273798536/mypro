import { AlertTriangle, RefreshCw, Building2 } from 'lucide-react';
import { useAppStore, useFilteredRecords } from '../../store/useAppStore';
import type { IndustryType, RatingLevel } from '../../types';
import { RATING_ORDER } from '../../utils/ratingUtils';

const INDUSTRIES: IndustryType[] = [
  '制造业',
  '金融业',
  '房地产业',
  '批发零售业',
  '交通运输业',
  '信息技术业',
  '其他',
];

export default function FilterPanel() {
  const {
    filters,
    setFilters,
    toggleIndustryFilter,
    toggleRatingFilter,
    resetFilters,
    balanceWeightEnabled,
    setBalanceWeightEnabled,
    showAnomalies,
    setShowAnomalies,
  } = useAppStore();

  const filteredRecords = useFilteredRecords();
  const totalRecords = useAppStore((s) => s.records.length);

  const hasInvalidFilter = filteredRecords.length === 0 && totalRecords > 0;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">数据筛选</h3>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw size={14} />
          重置
        </button>
      </div>

      {hasInvalidFilter && (
        <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm text-red-300 font-medium">筛选条件无效</p>
            <p className="text-xs text-red-400 mt-1">当前筛选条件下无有效数据，请调整选择</p>
          </div>
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Building2 size={14} />
          行业标签
        </label>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              onClick={() => toggleIndustryFilter(industry)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filters.industries.includes(industry)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-2 block">评级等级</label>
        <div className="flex flex-wrap gap-1">
          {RATING_ORDER.map((rating) => (
            <button
              key={rating}
              onClick={() => toggleRatingFilter(rating as RatingLevel)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                filters.ratings.includes(rating as RatingLevel)
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-2 block">
          余额区间: {filters.balanceMin.toLocaleString()} - {filters.balanceMax.toLocaleString()} 万
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.balanceMin}
            onChange={(e) => setFilters({ balanceMin: Number(e.target.value) })}
            className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="最小值"
          />
          <input
            type="number"
            value={filters.balanceMax}
            onChange={(e) => setFilters({ balanceMax: Number(e.target.value) })}
            className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="最大值"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-2 block">
          迁徙次数: {filters.migrationCountMin} - {filters.migrationCountMax}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.migrationCountMin}
            onChange={(e) => setFilters({ migrationCountMin: Number(e.target.value) })}
            className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            min={1}
          />
          <input
            type="number"
            value={filters.migrationCountMax}
            onChange={(e) => setFilters({ migrationCountMax: Number(e.target.value) })}
            className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            min={1}
          />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-slate-300">显示选项</h4>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-slate-400">余额权重</span>
          <button
            onClick={() => setBalanceWeightEnabled(!balanceWeightEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              balanceWeightEnabled ? 'bg-purple-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                balanceWeightEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-slate-400">异常高亮</span>
          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showAnomalies ? 'bg-red-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showAnomalies ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="text-xs text-slate-500">
          当前筛选结果: <span className="text-slate-300 font-mono">{filteredRecords.length}</span> 条记录
        </div>
      </div>
    </div>
  );
}
