import * as React from 'react';
import { Filter, X, RefreshCw, Calendar } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import type { FilterCriteria, Material, TestBench, WorkingConditionSegment, AnomalyType, DataCaliberType } from '@/types';
import { format } from 'date-fns';

interface FilterPanelProps {
  filters: FilterCriteria;
  materials: Material[];
  testBenches: TestBench[];
  segments: WorkingConditionSegment[];
  onFilterChange: (filters: Partial<FilterCriteria>) => void;
  onReset: () => void;
  className?: string;
  showCaliberSelector?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  materials,
  testBenches,
  segments,
  onFilterChange,
  onReset,
  className,
  showCaliberSelector = true,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  const anomalyTypes: { value: AnomalyType; label: string }[] = [
    { value: 'speed_missing', label: '转速缺采' },
    { value: 'temp_overlimit', label: '温升超限' },
    { value: 'power_reverse', label: '功率反号' },
  ];

  const caliberTypes: { value: DataCaliberType; label: string }[] = [
    { value: 'all', label: '全部口径' },
    { value: 'voltage_current', label: '电压电流' },
    { value: 'temperature', label: '温度序列' },
    { value: 'efficiency', label: '效率报告' },
  ];

  const hasActiveFilters = filters.testBenchIds.length > 0 ||
    filters.materialIds.length > 0 ||
    filters.segmentIds.length > 0 ||
    filters.anomalyTypes.length > 0 ||
    filters.dataCaliber !== 'all' ||
    filters.timeRange !== null;

  return (
    <Card className={cn('mb-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-industrial-text-muted" />
          <span className="font-medium text-industrial-text">筛选条件</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
              已筛选
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={onReset}
          >
            重置
          </Button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-industrial-bg text-industrial-text-muted"
          >
            <svg
              className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="测试台"
              placeholder="选择测试台"
              value={filters.testBenchIds[0] || ''}
              onChange={(e) => onFilterChange({ testBenchIds: e.target.value ? [e.target.value] : [] })}
              options={testBenches.map((tb) => ({ value: tb.id, label: `${tb.code} - ${tb.name}` }))}
            />

            <Select
              label="材料"
              placeholder="选择材料"
              value={filters.materialIds[0] || ''}
              onChange={(e) => onFilterChange({ materialIds: e.target.value ? [e.target.value] : [] })}
              options={materials.map((m) => ({ value: m.id, label: `${m.code} - ${m.name}` }))}
            />

            <Select
              label="工况分段"
              placeholder="选择工况"
              value={filters.segmentIds[0] || ''}
              onChange={(e) => onFilterChange({ segmentIds: e.target.value ? [e.target.value] : [] })}
              options={segments.map((s) => ({ value: s.id, label: s.name }))}
            />

            {showCaliberSelector && (
              <Select
                label="数据口径"
                value={filters.dataCaliber}
                onChange={(e) => onFilterChange({ dataCaliber: e.target.value as DataCaliberType })}
                options={caliberTypes}
              />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-industrial-text-muted">异常类型</span>
            <div className="flex flex-wrap gap-4">
              {anomalyTypes.map((type) => (
                <Checkbox
                  key={type.value}
                  label={type.label}
                  checked={filters.anomalyTypes.includes(type.value)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...filters.anomalyTypes, type.value]
                      : filters.anomalyTypes.filter((t) => t !== type.value);
                    onFilterChange({ anomalyTypes: newTypes });
                  }}
                />
              ))}
            </div>
          </div>

          {filters.timeRange && (
            <div className="flex items-center gap-2 text-sm text-industrial-text-muted">
              <Calendar className="w-4 h-4" />
              <span>
                {format(filters.timeRange[0], 'yyyy-MM-dd HH:mm')} ~{' '}
                {format(filters.timeRange[1], 'yyyy-MM-dd HH:mm')}
              </span>
              <button
                onClick={() => onFilterChange({ timeRange: null })}
                className="p-1 hover:bg-industrial-bg rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
