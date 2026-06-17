import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SEGMENTS, MODEL_VERSIONS, DEFAULT_FILTERS } from '@/types';
import { Filter, X, RotateCcw, ChevronDown, ChevronUp, Calendar, Gauge, Layers, Users, CircleDot } from 'lucide-react';

const statusOptions = [
  { id: 'all', name: '全部状态' },
  { id: 'pending', name: '待处理' },
  { id: 'approved', name: '已批准' },
  { id: 'rejected', name: '已拒绝' },
  { id: 'suspended', name: '已挂起' },
];

export const FilterPanel = () => {
  const { filters, setFilters, resetFilters } = useAppStore();
  const [expanded, setExpanded] = useState(true);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters({ [field]: value });
  };

  const handleScoreChange = (field: 'minScore' | 'maxScore', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setFilters({ [field]: numValue });
  };

  const handleSegmentToggle = (segmentId: string) => {
    const currentSegments = filters.segments;
    const newSegments = currentSegments.includes(segmentId)
      ? currentSegments.filter(id => id !== segmentId)
      : [...currentSegments, segmentId];
    setFilters({ segments: newSegments });
  };

  const handleReset = () => {
    resetFilters();
  };

  const hasActiveFilters = 
    filters.startDate !== DEFAULT_FILTERS.startDate ||
    filters.endDate !== DEFAULT_FILTERS.endDate ||
    filters.minScore !== DEFAULT_FILTERS.minScore ||
    filters.maxScore !== DEFAULT_FILTERS.maxScore ||
    filters.modelVersion !== DEFAULT_FILTERS.modelVersion ||
    filters.segments.length > 0 ||
    filters.status !== DEFAULT_FILTERS.status;

  return (
    <div className="bg-white border-r border-navy-200 w-72 flex-shrink-0 flex flex-col h-full">
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-navy-200 cursor-pointer hover:bg-navy-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-navy-500" />
          <span className="font-semibold text-navy-700 text-sm">筛选条件</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
              已筛选
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-navy-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-navy-400" />
        )}
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              <span>时间范围</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-navy-500 block mb-1">开始日期</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-navy-500 block mb-1">结束日期</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="input-field text-xs"
                />
              </div>
            </div>
          </div>

          <div className="divider-dashed" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500 uppercase tracking-wide">
              <Gauge className="w-3.5 h-3.5" />
              <span>评分范围</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-navy-500 block mb-1">最低分</label>
                <input
                  type="number"
                  placeholder="不限"
                  value={filters.minScore ?? ''}
                  onChange={(e) => handleScoreChange('minScore', e.target.value)}
                  className="input-field text-xs"
                  min="300"
                  max="900"
                />
              </div>
              <div>
                <label className="text-xs text-navy-500 block mb-1">最高分</label>
                <input
                  type="number"
                  placeholder="不限"
                  value={filters.maxScore ?? ''}
                  onChange={(e) => handleScoreChange('maxScore', e.target.value)}
                  className="input-field text-xs"
                  min="300"
                  max="900"
                />
              </div>
            </div>
          </div>

          <div className="divider-dashed" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500 uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5" />
              <span>模型版本</span>
            </div>
            <select
              value={filters.modelVersion}
              onChange={(e) => setFilters({ modelVersion: e.target.value })}
              className="input-field text-xs"
            >
              <option value="all">全部模型</option>
              {MODEL_VERSIONS.map(mv => (
                <option key={mv.id} value={mv.id}>{mv.name}</option>
              ))}
            </select>
          </div>

          <div className="divider-dashed" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              <span>客户分层</span>
            </div>
            <div className="space-y-1.5">
              {SEGMENTS.map(segment => (
                <label key={segment.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.segments.includes(segment.id)}
                    onChange={() => handleSegmentToggle(segment.id)}
                    className="w-4 h-4 text-navy-600 border-navy-300 focus:ring-amber-500"
                  />
                  <span className="text-sm text-navy-600 group-hover:text-navy-800">
                    {segment.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="divider-dashed" />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500 uppercase tracking-wide">
              <CircleDot className="w-3.5 h-3.5" />
              <span>样本状态</span>
            </div>
            <div className="space-y-1.5">
              {statusOptions.map(status => (
                <label key={status.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === status.id}
                    onChange={() => setFilters({ status: status.id })}
                    className="w-4 h-4 text-navy-600 border-navy-300 focus:ring-amber-500"
                  />
                  <span className="text-sm text-navy-600 group-hover:text-navy-800">
                    {status.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="divider-dashed" />

          <button
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="w-full btn flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            重置筛选条件
          </button>
        </div>
      )}
    </div>
  );
};
