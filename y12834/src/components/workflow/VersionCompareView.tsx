import {
  GitCompare,
  ChevronDown,
  ArrowLeftRight,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
/**
 * 差异类型
 */
type DiffType = 'added' | 'modified' | 'removed' | 'unchanged';

/**
 * 单个对比指标数据
 */
export interface DiffMetric {
  /** 指标名称 */
  name: string;
  /** 左侧版本值 */
  leftValue: string | number;
  /** 右侧版本值 */
  rightValue: string | number;
  /** 差异类型 */
  type: DiffType;
  /** 计量单位（可选） */
  unit?: string;
}

/**
 * 版本对比差异数据
 */
export interface VersionDiffData {
  /** 左侧版本样本数量 */
  leftSampleCount: number;
  /** 右侧版本样本数量 */
  rightSampleCount: number;
  /** 左侧版本标注数量 */
  leftAnnotationCount: number;
  /** 右侧版本标注数量 */
  rightAnnotationCount: number;
  /** 左侧版本异常数量 */
  leftAnomalyCount: number;
  /** 右侧版本异常数量 */
  rightAnomalyCount: number;
  /** 各指标对比列表 */
  metrics: DiffMetric[];
}

/**
 * 版本选项
 */
interface VersionOption {
  id: string;
  label: string;
}

/**
 * 版本对比视图组件属性接口
 */
interface VersionCompareViewProps {
  /** 左侧选中的运行ID */
  runIdLeft: string;
  /** 右侧选中的运行ID */
  runIdRight: string;
  /** 左侧版本选择回调 */
  onSelectLeft: (id: string) => void;
  /** 右侧版本选择回调 */
  onSelectRight: (id: string) => void;
  /** 差异数据 */
  diffData: VersionDiffData;
}

/**
 * 可用版本选项（示例数据）
 */
const VERSION_OPTIONS: VersionOption[] = [
  { id: 'run_001', label: 'v2026.05.20-r1' },
  { id: 'run_002', label: 'v2026.06.01-r1' },
  { id: 'run_003', label: 'v2026.06.10-r1' },
];

/**
 * 获取差异类型对应的样式类名
 */
function getDiffClass(type: DiffType, side: 'left' | 'right'): string {
  switch (type) {
    case 'added':
      return side === 'right'
        ? 'bg-life-green/15 text-life-green font-medium'
        : 'bg-deep-ocean/5 text-deep-ocean/30 line-through';
    case 'removed':
      return side === 'left'
        ? 'bg-deep-ocean/10 text-deep-ocean/60 line-through'
        : 'bg-deep-ocean/5 text-deep-ocean/30';
    case 'modified':
      return side === 'left'
        ? 'bg-amber-warn/15 text-amber-warn line-through'
        : 'bg-amber-warn/15 text-amber-warn font-medium';
    default:
      return 'text-deep-ocean';
  }
}

/**
 * 获取差异图标
 */
function DiffIcon({ type }: { type: DiffType }) {
  switch (type) {
    case 'added':
      return <Plus size={14} className="text-life-green" />;
    case 'removed':
      return <Minus size={14} className="text-deep-ocean/40" />;
    case 'modified':
      return <Edit3 size={14} className="text-amber-warn" />;
    default:
      return null;
  }
}

/**
 * 版本对比视图组件
 * 左右分栏对比两个版本的统计指标
 */
export function VersionCompareView({
  runIdLeft,
  runIdRight,
  onSelectLeft,
  onSelectRight,
  diffData,
}: VersionCompareViewProps) {
  /**
   * 基础统计项列表
   */
  const baseStats = [
    {
      name: '样本数量',
      left: diffData.leftSampleCount,
      right: diffData.rightSampleCount,
      type: (() => {
        if (diffData.leftSampleCount === diffData.rightSampleCount)
          return 'unchanged' as DiffType;
        if (diffData.leftSampleCount < diffData.rightSampleCount)
          return 'added' as DiffType;
        return 'removed' as DiffType;
      })(),
    },
    {
      name: '标注数量',
      left: diffData.leftAnnotationCount,
      right: diffData.rightAnnotationCount,
      type: (() => {
        if (diffData.leftAnnotationCount === diffData.rightAnnotationCount)
          return 'unchanged' as DiffType;
        if (diffData.leftAnnotationCount < diffData.rightAnnotationCount)
          return 'added' as DiffType;
        return 'removed' as DiffType;
      })(),
    },
    {
      name: '异常数量',
      left: diffData.leftAnomalyCount,
      right: diffData.rightAnomalyCount,
      type: (() => {
        if (diffData.leftAnomalyCount === diffData.rightAnomalyCount)
          return 'unchanged' as DiffType;
        if (diffData.leftAnomalyCount < diffData.rightAnomalyCount)
          return 'added' as DiffType;
        return 'removed' as DiffType;
      })(),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-deep-ocean/10 bg-paper/50">
        <GitCompare size={20} className="text-deep-ocean" />
        <h2 className="text-lg font-serif font-semibold text-deep-ocean">
          版本对比
        </h2>
      </div>

      {/* 版本选择栏 */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-6 py-4 border-b border-deep-ocean/10 items-center">
        {/* 左侧版本选择 */}
        <div className="relative">
          <label className="block text-xs text-deep-ocean/50 mb-1.5">
            左侧版本
          </label>
          <select
            value={runIdLeft}
            onChange={(e) => onSelectLeft(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all pr-10"
          >
            {VERSION_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 bottom-2.5 text-deep-ocean/40 pointer-events-none"
          />
        </div>

        {/* 中间对比箭头 */}
        <div className="flex flex-col items-center justify-center pt-5">
          <div className="w-10 h-10 rounded-full bg-deep-ocean/10 flex items-center justify-center">
            <ArrowLeftRight size={18} className="text-deep-ocean" />
          </div>
        </div>

        {/* 右侧版本选择 */}
        <div className="relative">
          <label className="block text-xs text-deep-ocean/50 mb-1.5">
            右侧版本
          </label>
          <select
            value={runIdRight}
            onChange={(e) => onSelectRight(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all pr-10"
          >
            {VERSION_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 bottom-2.5 text-deep-ocean/40 pointer-events-none"
          />
        </div>
      </div>

      {/* 对比表格 */}
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-deep-ocean/10">
              <th className="text-left text-xs text-deep-ocean/50 font-medium pb-3 w-1/4">
                指标
              </th>
              <th className="text-right text-xs text-deep-ocean/50 font-medium pb-3 w-[30%]">
                {VERSION_OPTIONS.find((v) => v.id === runIdLeft)?.label}
              </th>
              <th className="text-center text-xs text-deep-ocean/50 font-medium pb-3 w-[10%]">
                差异
              </th>
              <th className="text-right text-xs text-deep-ocean/50 font-medium pb-3 w-[30%]">
                {VERSION_OPTIONS.find((v) => v.id === runIdRight)?.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 基础统计 */}
            {baseStats.map((stat, idx) => (
              <tr
                key={stat.name}
                className={idx < baseStats.length - 1 || diffData.metrics.length > 0 ? 'border-b border-deep-ocean/5' : ''}
              >
                <td className="py-3 text-sm text-deep-ocean/70">
                  {stat.name}
                </td>
                <td
                  className={`py-3 text-right text-sm tabular rounded-l px-3 ${getDiffClass(
                    stat.type,
                    'left'
                  )}`}
                >
                  {stat.left.toLocaleString()}
                </td>
                <td className="py-3 text-center">
                  <div className="flex justify-center">
                    <DiffIcon type={stat.type} />
                  </div>
                </td>
                <td
                  className={`py-3 text-right text-sm tabular rounded-r px-3 ${getDiffClass(
                    stat.type,
                    'right'
                  )}`}
                >
                  {stat.right.toLocaleString()}
                </td>
              </tr>
            ))}

            {/* 分组标题 */}
            {diffData.metrics.length > 0 && (
              <tr>
                <td colSpan={4} className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-deep-ocean/10" />
                    <span className="text-xs font-medium text-deep-ocean/50 px-2">
                      详细指标
                    </span>
                    <div className="h-px flex-1 bg-deep-ocean/10" />
                  </div>
                </td>
              </tr>
            )}

            {/* 各指标数值对比 */}
            {diffData.metrics.map((metric, idx) => (
              <tr
                key={metric.name}
                className={
                  idx < diffData.metrics.length - 1
                    ? 'border-b border-deep-ocean/5'
                    : ''
                }
              >
                <td className="py-3 text-sm text-deep-ocean/70">
                  <div className="flex items-center gap-2">
                    {metric.name}
                    {metric.unit && (
                      <span className="text-xs text-deep-ocean/40">
                        ({metric.unit})
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className={`py-3 text-right text-sm tabular rounded-l px-3 ${getDiffClass(
                    metric.type,
                    'left'
                  )}`}
                >
                  {typeof metric.leftValue === 'number'
                    ? metric.leftValue.toLocaleString()
                    : metric.leftValue}
                </td>
                <td className="py-3 text-center">
                  <div className="flex justify-center">
                    <DiffIcon type={metric.type} />
                  </div>
                </td>
                <td
                  className={`py-3 text-right text-sm tabular rounded-r px-3 ${getDiffClass(
                    metric.type,
                    'right'
                  )}`}
                >
                  {typeof metric.rightValue === 'number'
                    ? metric.rightValue.toLocaleString()
                    : metric.rightValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 图例 */}
        <div className="mt-6 pt-4 border-t border-deep-ocean/10 flex flex-wrap items-center gap-4">
          <span className="text-xs text-deep-ocean/50">图例：</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-life-green/15 items-center justify-center">
              <Plus size={10} className="text-life-green" />
            </span>
            <span className="text-xs text-deep-ocean/60">新增</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-amber-warn/15 items-center justify-center">
              <Edit3 size={10} className="text-amber-warn" />
            </span>
            <span className="text-xs text-deep-ocean/60">修改</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-deep-ocean/10 items-center justify-center">
              <Minus size={10} className="text-deep-ocean/40" />
            </span>
            <span className="text-xs text-deep-ocean/60">删除</span>
          </div>
        </div>
      </div>
    </div>
  );
}
