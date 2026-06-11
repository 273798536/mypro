import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Calendar, Tag, X } from 'lucide-react';

/**
 * 筛选条件接口
 */
export interface SampleFilters {
  /** 选中的物种列表 */
  species: string[];
  /** 选中的分组 */
  group: string | null;
  /** 起始日期（YYYY-MM-DD） */
  startDate: string | null;
  /** 结束日期（YYYY-MM-DD） */
  endDate: string | null;
  /** 版本号ID */
  versionId: string | null;
  /** 搜索关键词 */
  keyword: string;
}

/**
 * 筛选栏组件属性接口
 */
interface SampleFilterBarProps {
  /** 当前筛选条件 */
  filters: SampleFilters;
  /** 筛选条件变化回调 */
  onChange: (filters: SampleFilters) => void;
}

/**
 * 可用物种列表（示例数据）
 */
const AVAILABLE_SPECIES = ['斑马鱼', '青鳉鱼', '孔雀鱼', '金鱼', '鲤鱼'];

/**
 * 可用分组列表（示例数据）
 */
const AVAILABLE_GROUPS = ['A', 'B', 'C', 'D'];

/**
 * 可用版本列表（示例数据）
 */
const AVAILABLE_VERSIONS = [
  { id: 'run_001', label: 'v2026.05.20-r1' },
  { id: 'run_002', label: 'v2026.06.01-r1' },
  { id: 'run_003', label: 'v2026.06.10-r1' },
];

/**
 * 样本筛选栏组件
 * 包含物种多选、分组选择、日期范围、版本选择和搜索框
 */
export function SampleFilterBar({ filters, onChange }: SampleFilterBarProps) {
  /** 物种下拉框展开状态 */
  const [speciesOpen, setSpeciesOpen] = useState(false);
  /** 物种下拉框引用 */
  const speciesRef = useRef<HTMLDivElement>(null);

  /** 点击外部关闭物种下拉框 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speciesRef.current && !speciesRef.current.contains(e.target as Node)) {
        setSpeciesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * 切换物种选中状态
   */
  const toggleSpecies = (species: string) => {
    const newSpecies = filters.species.includes(species)
      ? filters.species.filter((s) => s !== species)
      : [...filters.species, species];
    onChange({ ...filters, species: newSpecies });
  };

  /**
   * 清除所有筛选条件
   */
  const clearAll = () => {
    onChange({
      species: [],
      group: null,
      startDate: null,
      endDate: null,
      versionId: null,
      keyword: '',
    });
  };

  const hasActiveFilters =
    filters.species.length > 0 ||
    filters.group !== null ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.versionId !== null ||
    filters.keyword !== '';

  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 物种多选下拉 */}
        <div ref={speciesRef} className="relative">
          <button
            onClick={() => setSpeciesOpen(!speciesOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-paper border border-deep-ocean/15 rounded hover:border-deep-ocean/30 transition-colors min-w-[140px]"
          >
            <Tag size={16} className="text-deep-ocean/60" />
            <span className="text-sm text-deep-ocean/80">
              {filters.species.length > 0
                ? `物种 (${filters.species.length})`
                : '物种'}
            </span>
            <ChevronDown
              size={16}
              className={`text-deep-ocean/60 transition-transform ${speciesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {speciesOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lift border border-deep-ocean/10 py-1 z-20">
              {AVAILABLE_SPECIES.map((species) => (
                <label
                  key={species}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-paper cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.species.includes(species)}
                    onChange={() => toggleSpecies(species)}
                    className="rounded border-deep-ocean/30 text-deep-ocean focus:ring-deep-ocean/30"
                  />
                  <span className="text-sm text-deep-ocean">{species}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 分组选择 */}
        <select
          value={filters.group || ''}
          onChange={(e) => onChange({ ...filters, group: e.target.value || null })}
          className="px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all min-w-[100px]"
        >
          <option value="">全部分组</option>
          {AVAILABLE_GROUPS.map((g) => (
            <option key={g} value={g}>
              分组 {g}
            </option>
          ))}
        </select>

        {/* 日期范围 - 起始 */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-deep-ocean/60" />
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value || null })}
            className="px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all"
          />
          <span className="text-deep-ocean/40">至</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value || null })}
            className="px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all"
          />
        </div>

        {/* 版本号选择 */}
        <select
          value={filters.versionId || ''}
          onChange={(e) => onChange({ ...filters, versionId: e.target.value || null })}
          className="px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all min-w-[150px]"
        >
          <option value="">全部版本</option>
          {AVAILABLE_VERSIONS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-ocean/40"
          />
          <input
            type="text"
            placeholder="搜索样本ID、物种名..."
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean placeholder:text-deep-ocean/40 focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all"
          />
          {filters.keyword && (
            <button
              onClick={() => onChange({ ...filters, keyword: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-deep-ocean/10 text-deep-ocean/40 hover:text-deep-ocean/60"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-2 text-sm text-corral-severe hover:bg-corral-severe/10 rounded transition-colors"
          >
            <X size={16} />
            清除
          </button>
        )}
      </div>

      {/* 已选筛选条件标签 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-deep-ocean/10">
          {filters.species.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-1 bg-deep-ocean/10 text-deep-ocean text-xs rounded"
            >
              {s}
              <button
                onClick={() => toggleSpecies(s)}
                className="hover:text-corral-severe"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.group && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-life-green/15 text-life-green text-xs rounded">
              分组 {filters.group}
              <button
                onClick={() => onChange({ ...filters, group: null })}
                className="hover:text-corral-severe"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-warn/15 text-amber-warn text-xs rounded">
              {filters.startDate || '...'} ~ {filters.endDate || '...'}
              <button
                onClick={() =>
                  onChange({ ...filters, startDate: null, endDate: null })
                }
                className="hover:text-corral-severe"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.versionId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-ocean/10 text-deep-ocean text-xs rounded">
              {AVAILABLE_VERSIONS.find((v) => v.id === filters.versionId)?.label}
              <button
                onClick={() => onChange({ ...filters, versionId: null })}
                className="hover:text-corral-severe"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
