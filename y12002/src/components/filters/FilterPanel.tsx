import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, RotateCcw, Save } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { LiabilityFilters, AccountType, BusinessCategory, ReviewStatus } from '@/types';

const accountTypes: AccountType[] = ['普通', '银卡', '金卡', '白金卡'];
const businessCategories: BusinessCategory[] = ['正常', '升舱退回', '活动双倍', '里程过期'];
const reviewStatuses: ReviewStatus[] = ['未复核', '复核中', '已复核', '已冲回'];

export const FilterPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const resetFilters = useAppStore((state) => state.resetFilters);

  const handleFilterChange = (key: keyof LiabilityFilters, value: any) => {
    setFilters({ [key]: value });
  };

  const handleMultiSelect = (key: keyof LiabilityFilters, value: string) => {
    const current = (filters[key] as string[] | undefined) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ [key]: updated.length > 0 ? updated : undefined });
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== false
  );

  return (
    <div className="card mb-6">
      <div 
        className="flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-[#1E3A5F]" />
          <h3 className="font-semibold font-display text-gray-900">高级筛选</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs rounded-full font-medium">
              已设置筛选条件
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="label">会员号</label>
              <input
                type="text"
                placeholder="输入会员号"
                className="input"
                value={filters.memberNo || ''}
                onChange={(e) => handleFilterChange('memberNo', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="label">会员姓名</label>
              <input
                type="text"
                placeholder="输入会员姓名"
                className="input"
                value={filters.memberName || ''}
                onChange={(e) => handleFilterChange('memberName', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="label">剩余里程(最小)</label>
              <input
                type="number"
                placeholder="最小里程数"
                className="input"
                value={filters.minMiles || ''}
                onChange={(e) => handleFilterChange('minMiles', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="label">剩余里程(最大)</label>
              <input
                type="number"
                placeholder="最大里程数"
                className="input"
                value={filters.maxMiles || ''}
                onChange={(e) => handleFilterChange('maxMiles', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="label">负债金额(最小)</label>
              <input
                type="number"
                placeholder="最小负债金额"
                className="input"
                value={filters.minLiability || ''}
                onChange={(e) => handleFilterChange('minLiability', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="label">负债金额(最大)</label>
              <input
                type="number"
                placeholder="最大负债金额"
                className="input"
                value={filters.maxLiability || ''}
                onChange={(e) => handleFilterChange('maxLiability', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="label">过期日期(从)</label>
              <input
                type="date"
                className="input"
                value={filters.expireDateFrom || ''}
                onChange={(e) => handleFilterChange('expireDateFrom', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="label">过期日期(至)</label>
              <input
                type="date"
                className="input"
                value={filters.expireDateTo || ''}
                onChange={(e) => handleFilterChange('expireDateTo', e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label mb-3">账户类型</label>
              <div className="flex flex-wrap gap-2">
                {accountTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleMultiSelect('accountType', type)}
                    className={cn(
                      'filter-chip',
                      filters.accountType?.includes(type) && 'filter-chip-active'
                    )}
                  >
                    {type}
                    {filters.accountType?.includes(type) && (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label mb-3">业务类型</label>
              <div className="flex flex-wrap gap-2">
                {businessCategories.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleMultiSelect('businessCategory', type)}
                    className={cn(
                      'filter-chip',
                      filters.businessCategory?.includes(type) && 'filter-chip-active'
                    )}
                  >
                    {type}
                    {filters.businessCategory?.includes(type) && (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label mb-3">复核状态</label>
              <div className="flex flex-wrap gap-2">
                {reviewStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMultiSelect('reviewStatus', status)}
                    className={cn(
                      'filter-chip',
                      filters.reviewStatus?.includes(status) && 'filter-chip-active'
                    )}
                  >
                    {status}
                    {filters.reviewStatus?.includes(status) && (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeExpired || false}
                  onChange={(e) => handleFilterChange('includeExpired', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                />
                <span className="text-sm text-gray-700">包含过期里程记录</span>
              </label>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                警告：过期记录默认不参与正常计算
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {hasActiveFilters ? '已设置筛选条件，点击重置可清除' : '暂无筛选条件'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetFilters}
                className="btn btn-ghost gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重置筛选
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
