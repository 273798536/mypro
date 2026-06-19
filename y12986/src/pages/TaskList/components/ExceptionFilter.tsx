import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckboxGroup } from '@/components/ui/CheckboxGroup';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Filter, X, RefreshCw } from 'lucide-react';
import type {
  ExceptionType,
  Severity,
  RecordStatus,
} from '@/types';
import {
  getExceptionTypeLabel,
  getSeverityLabel,
  getRecordStatusLabel,
} from '@/utils/format';

const exceptionTypeOptions: { label: string; value: ExceptionType }[] = [
  { label: getExceptionTypeLabel('index_invalid'), value: 'index_invalid' },
  { label: getExceptionTypeLabel('permission_missing'), value: 'permission_missing' },
  { label: getExceptionTypeLabel('schema_changed'), value: 'schema_changed' },
  { label: getExceptionTypeLabel('data_inconsistent'), value: 'data_inconsistent' },
];

const severityOptions: { label: string; value: Severity }[] = [
  { label: getSeverityLabel('high'), value: 'high' },
  { label: getSeverityLabel('medium'), value: 'medium' },
  { label: getSeverityLabel('low'), value: 'low' },
];

const statusOptions: { label: string; value: RecordStatus }[] = [
  { label: getRecordStatusLabel('pending'), value: 'pending' },
  { label: getRecordStatusLabel('reviewing'), value: 'reviewing' },
  { label: getRecordStatusLabel('confirmed'), value: 'confirmed' },
];

export const ExceptionFilter: React.FC = () => {
  const { state, setFilters, resetFilters } = useApp();
  const { filters } = state;

  const activeCount =
    filters.exceptionTypes.length +
    filters.severities.length +
    filters.statuses.length +
    (filters.searchKeyword ? 1 : 0);

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/60">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">筛选条件</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[10px] font-bold bg-amber-500 text-white rounded-none">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={resetFilters}
          >
            重置
          </Button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <SearchInput
          value={filters.searchKeyword}
          onChange={(v) => setFilters({ searchKeyword: v })}
          placeholder="搜索ID/表/服务..."
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <CheckboxGroup
          label="异常类型"
          options={exceptionTypeOptions}
          value={filters.exceptionTypes}
          onChange={(v) => setFilters({ exceptionTypes: v })}
          collapsible
        />
        <div className="h-px bg-gray-100 -mx-4" />
        <CheckboxGroup
          label="严重程度"
          options={severityOptions}
          value={filters.severities}
          onChange={(v) => setFilters({ severities: v })}
          collapsible
        />
        <div className="h-px bg-gray-100 -mx-4" />
        <CheckboxGroup
          label="处理状态"
          options={statusOptions}
          value={filters.statuses}
          onChange={(v) => setFilters({ statuses: v })}
          collapsible
        />
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50/60 text-[11px] text-gray-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>提示：</span>
        </div>
        <ul className="space-y-0.5 pl-3 list-disc list-inside text-gray-400">
          <li>可多选组合筛选条件</li>
          <li>严重程度越高优先级越高</li>
          <li>待处理异常建议 24h 内复核</li>
        </ul>
      </div>
    </div>
  );
};
