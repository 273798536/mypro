// 筛选面板组件 - 提供多维度筛选条件，支持标签展示和导出
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Download,
  X,
  ChevronDown,
  Check,
  Filter as FilterIcon,
  Calendar,
  AlertTriangle,
  Copy,
  MapPin,
  Route,
  Tag,
} from 'lucide-react';
import useBusBayStore from '@/store';
import { STATUS_LABELS } from '@/utils/dataUtils';
import { cn } from '@/lib/utils';
import type { BayStatus } from '@/types';

// 状态选项配置
const STATUS_OPTIONS: { value: BayStatus; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'text-emerald-700' },
  { value: 'abnormal', label: '异常', color: 'text-red-700' },
  { value: 'pending', label: '待复核', color: 'text-amber-700' },
];

// 布尔选项
const BOOLEAN_OPTIONS: { value: boolean | null; label: string }[] = [
  { value: true, label: '是' },
  { value: false, label: '否' },
];

// 多选下拉框组件
interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  icon: Icon,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-left transition-all duration-200',
          'focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100',
          !disabled && 'hover:border-prussia-300 cursor-pointer',
          disabled && 'bg-slate-50 cursor-not-allowed opacity-60',
          open && 'border-prussia-500 ring-2 ring-prussia-100'
        )}
      >
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        <span
          className={cn(
            'flex-1 truncate',
            selected.length === 0 ? 'text-slate-400' : 'text-slate-900'
          )}
        >
          {selected.length === 0
            ? placeholder
            : selected.length === 1
            ? selected[0]
            : `已选 ${selected.length} 项`}
        </span>
        {selected.length > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">
              暂无选项
            </div>
          ) : (
            options.map(opt => (
              <div
                key={opt}
                onClick={() => toggleOption(opt)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-prussia-50 transition-colors"
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    selected.includes(opt)
                      ? 'bg-prussia-600 border-prussia-600'
                      : 'border-slate-300'
                  )}
                >
                  {selected.includes(opt) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span
                  className={cn(
                    'truncate',
                    selected.includes(opt)
                      ? 'text-prussia-900 font-medium'
                      : 'text-slate-700'
                  )}
                >
                  {opt}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// 状态多选下拉
interface StatusMultiSelectProps {
  selected: BayStatus[];
  onChange: (values: BayStatus[]) => void;
}

function StatusMultiSelect({ selected, onChange }: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: BayStatus) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-left transition-all duration-200',
          'focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100',
          'hover:border-prussia-300 cursor-pointer',
          open && 'border-prussia-500 ring-2 ring-prussia-100'
        )}
      >
        <Tag className="w-4 h-4 text-slate-400 shrink-0" />
        <span
          className={cn(
            'flex-1 truncate',
            selected.length === 0 ? 'text-slate-400' : 'text-slate-900'
          )}
        >
          {selected.length === 0
            ? '状态（多选）'
            : selected.map(s => STATUS_LABELS[s]).join('、')}
        </span>
        {selected.length > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          {STATUS_OPTIONS.map(opt => (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-prussia-50 transition-colors"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  selected.includes(opt.value)
                    ? 'bg-prussia-600 border-prussia-600'
                    : 'border-slate-300'
                )}
              >
                {selected.includes(opt.value) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  opt.value === 'normal' && 'bg-emerald-500',
                  opt.value === 'abnormal' && 'bg-red-500',
                  opt.value === 'pending' && 'bg-amber-500'
                )}
              />
              <span
                className={cn(
                  selected.includes(opt.value)
                    ? 'text-prussia-900 font-medium'
                    : 'text-slate-700',
                  opt.color
                )}
              >
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 单选下拉（用于布尔类型筛选）
interface BooleanSelectProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

function BooleanSelect({
  value,
  onChange,
  icon: Icon,
  placeholder,
}: BooleanSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel =
    value === null ? placeholder : value === true ? '是' : '否';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-left transition-all duration-200',
          'focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100',
          'hover:border-prussia-300 cursor-pointer',
          open && 'border-prussia-500 ring-2 ring-prussia-100'
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 shrink-0',
            value === null ? 'text-slate-400' : 'text-slate-500'
          )}
        />
        <span
          className={cn(
            'flex-1 truncate',
            value === null ? 'text-slate-400' : 'text-slate-900'
          )}
        >
          {displayLabel}
        </span>
        {value !== null && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          {BOOLEAN_OPTIONS.map(opt => (
            <div
              key={String(opt.value)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                value === opt.value
                  ? 'bg-prussia-50 text-prussia-900 font-medium'
                  : 'hover:bg-prussia-50 text-slate-700'
              )}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 筛选面板组件 Props
export interface FilterPanelProps {
  onExport?: () => void; // 自定义导出回调，不填则调用 store 的 createExportBatch
  showExportButton?: boolean; // 是否显示导出按钮
  className?: string; // 自定义外层样式
}

// 筛选标签项
interface FilterTag {
  key: string;
  label: string;
  onRemove: () => void;
  color: 'default' | 'primary' | 'danger' | 'warning';
}

export function FilterPanel({
  onExport,
  showExportButton = true,
  className,
}: FilterPanelProps) {
  // 从 Store 读取数据
  const filters = useBusBayStore(state => state.filters);
  const bays = useBusBayStore(state => state.bays);
  const setFilters = useBusBayStore(state => state.setFilters);
  const resetFilters = useBusBayStore(state => state.resetFilters);
  const createExportBatch = useBusBayStore(state => state.createExportBatch);

  const allDistricts = useMemo(() => [...new Set(bays.map(b => b.district))].sort(), [bays]);
  const allRoads = useMemo(() => [...new Set(bays.map(b => b.road))].sort(), [bays]);

  // 关键词搜索防抖
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const keywordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setKeywordInput(filters.keyword);
  }, [filters.keyword]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeywordInput(val);
    if (keywordTimerRef.current) {
      window.clearTimeout(keywordTimerRef.current);
    }
    keywordTimerRef.current = window.setTimeout(() => {
      setFilters({ keyword: val });
    }, 300);
  };

  // 处理导出
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      createExportBatch('快速导出', '小赵');
    }
  };

  // 构建筛选标签
  const buildFilterTags = (): FilterTag[] => {
    const tags: FilterTag[] = [];

    // 行政区
    filters.districts.forEach(d => {
      tags.push({
        key: `district-${d}`,
        label: `行政区：${d}`,
        onRemove: () =>
          setFilters({
            districts: filters.districts.filter(x => x !== d),
          }),
        color: 'primary',
      });
    });

    // 道路
    filters.roads.forEach(r => {
      tags.push({
        key: `road-${r}`,
        label: `道路：${r}`,
        onRemove: () =>
          setFilters({ roads: filters.roads.filter(x => x !== r) }),
        color: 'default',
      });
    });

    // 状态
    filters.statuses.forEach(s => {
      tags.push({
        key: `status-${s}`,
        label: `状态：${STATUS_LABELS[s]}`,
        onRemove: () =>
          setFilters({ statuses: filters.statuses.filter(x => x !== s) }),
        color: s === 'abnormal' ? 'danger' : s === 'pending' ? 'warning' : 'default',
      });
    });

    // 是否有重复投诉
    if (filters.hasDuplicate !== null) {
      tags.push({
        key: 'hasDuplicate',
        label: `重复投诉：${filters.hasDuplicate ? '有' : '无'}`,
        onRemove: () => setFilters({ hasDuplicate: null }),
        color: 'warning',
      });
    }

    // 是否有坏数据
    if (filters.hasBadData !== null) {
      tags.push({
        key: 'hasBadData',
        label: `坏数据：${filters.hasBadData ? '有' : '无'}`,
        onRemove: () => setFilters({ hasBadData: null }),
        color: 'danger',
      });
    }

    // 日期范围
    if (filters.dateFrom || filters.dateTo) {
      const dateLabel = `日期：${filters.dateFrom ?? '...'} ~ ${filters.dateTo ?? '...'}`;
      tags.push({
        key: 'dateRange',
        label: dateLabel,
        onRemove: () => setFilters({ dateFrom: null, dateTo: null }),
        color: 'primary',
      });
    }

    // 关键词
    if (filters.keyword.trim()) {
      tags.push({
        key: 'keyword',
        label: `关键词：${filters.keyword.trim()}`,
        onRemove: () => setFilters({ keyword: '' }),
        color: 'primary',
      });
    }

    return tags;
  };

  const filterTags = buildFilterTags();

  const tagColorClasses: Record<FilterTag['color'], string> = {
    default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    primary: 'bg-prussia-50 text-prussia-700 hover:bg-prussia-100',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden',
        className
      )}
    >
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-prussia-600" />
          <span className="font-serif text-base font-semibold text-prussia-800">
            筛选条件
          </span>
          {filterTags.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-prussia-600 text-white rounded-full">
              {filterTags.length}
            </span>
          )}
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            disabled={filterTags.length === 0}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              filterTags.length > 0
                ? 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98]'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
          {showExportButton && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-prussia-700 text-white hover:bg-prussia-800 transition-all duration-200 active:scale-[0.98] shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
          )}
        </div>
      </div>

      {/* 筛选条件区域 */}
      <div className="p-4 space-y-4">
        {/* 第一行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 行政区多选 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              行政区
            </label>
            <MultiSelect
              options={allDistricts}
              selected={filters.districts}
              onChange={values => setFilters({ districts: values })}
              placeholder="全部行政区"
              icon={MapPin}
            />
          </div>

          {/* 道路多选 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              道路
            </label>
            <MultiSelect
              options={allRoads}
              selected={filters.roads}
              onChange={values => setFilters({ roads: values })}
              placeholder="全部道路"
              icon={Route}
            />
          </div>

          {/* 状态多选 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              站点状态
            </label>
            <StatusMultiSelect
              selected={filters.statuses}
              onChange={values => setFilters({ statuses: values })}
            />
          </div>

          {/* 关键词搜索 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              关键词搜索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={keywordInput}
                onChange={handleKeywordChange}
                placeholder="搜索站点名、道路..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100"
              />
              {keywordInput && (
                <button
                  onClick={() => {
                    setKeywordInput('');
                    setFilters({ keyword: '' });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 第二行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 重复投诉 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              有重复投诉
            </label>
            <BooleanSelect
              value={filters.hasDuplicate}
              onChange={v => setFilters({ hasDuplicate: v })}
              icon={Copy}
              placeholder="不限"
            />
          </div>

          {/* 坏数据 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              有坏数据
            </label>
            <BooleanSelect
              value={filters.hasBadData}
              onChange={v => setFilters({ hasBadData: v })}
              icon={AlertTriangle}
              placeholder="不限"
            />
          </div>

          {/* 日期 From */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              更新日期（起）
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={e =>
                  setFilters({ dateFrom: e.target.value || null })
                }
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100"
              />
              {filters.dateFrom && (
                <button
                  onClick={() => setFilters({ dateFrom: null })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 日期 To */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              更新日期（止）
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={e =>
                  setFilters({ dateTo: e.target.value || null })
                }
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:border-prussia-400 focus:ring-2 focus:ring-prussia-100"
              />
              {filters.dateTo && (
                <button
                  onClick={() => setFilters({ dateTo: null })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部筛选条件标签展示 */}
      {filterTags.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-xs text-slate-500 mt-1 shrink-0">
              已选条件：
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {filterTags.map(tag => (
                <span
                  key={tag.key}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer group',
                    tagColorClasses[tag.color]
                  )}
                  onClick={tag.onRemove}
                >
                  {tag.label}
                  <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </span>
              ))}
            </div>
            {filterTags.length > 3 && (
              <button
                onClick={resetFilters}
                className="text-xs text-prussia-600 hover:text-prussia-800 hover:underline transition-colors shrink-0 mt-1"
              >
                清空全部
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
