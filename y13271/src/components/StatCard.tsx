// 统计卡片组件 - 展示关键指标数据，带数字计数动画和hover效果
import { useEffect, useState, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

// 趋势数据类型
export interface StatTrend {
  value: number; // 趋势百分比，如 12.5 表示 +12.5%
  isPositive?: boolean; // true=上升/改善，false=下降/恶化，undefined=中性
  label?: string; // 趋势描述，如"较上月"
}

// 颜色预设类型
export type StatColorScheme =
  | 'prussia' // 普鲁士蓝（默认）
  | 'green' // 绿色（正常）
  | 'red' // 红色（异常）
  | 'amber' // 琥珀色（警告/待复核）
  | 'purple' // 紫色（重复数据）
  | 'slate'; // 灰色（中性）

// 颜色配置映射
const COLOR_CONFIG: Record<
  StatColorScheme,
  {
    bg: string; // 图标背景色
    icon: string; // 图标颜色
    ring: string; // 光环色（hover时）
    value: string; // 数字颜色
    accent: string; // 强调边框色
  }
> = {
  prussia: {
    bg: 'bg-prussia-50',
    icon: 'text-prussia-600',
    ring: 'group-hover:ring-prussia-200',
    value: 'text-prussia-900',
    accent: 'border-prussia-100',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    ring: 'group-hover:ring-emerald-200',
    value: 'text-emerald-900',
    accent: 'border-emerald-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    ring: 'group-hover:ring-red-200',
    value: 'text-red-900',
    accent: 'border-red-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    ring: 'group-hover:ring-amber-200',
    value: 'text-amber-900',
    accent: 'border-amber-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    ring: 'group-hover:ring-purple-200',
    value: 'text-purple-900',
    accent: 'border-purple-100',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'text-slate-600',
    ring: 'group-hover:ring-slate-200',
    value: 'text-slate-900',
    accent: 'border-slate-200',
  },
};

// 组件 Props 定义
export interface StatCardProps {
  icon: LucideIcon; // 左侧显示的 Lucide 图标
  label: string; // 指标名称，如"站点总数"
  value: number; // 显示的数值
  trend?: StatTrend; // 趋势数据（可选）
  color?: StatColorScheme; // 颜色方案（可选，默认普鲁士蓝）
  prefix?: string; // 数字前缀，如"¥"
  suffix?: string; // 数字后缀，如"%"
  onClick?: () => void; // 点击事件（可选）
  className?: string; // 自定义外层样式
}

// 数字缓动函数（easeOutCubic）
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'prussia',
  prefix = '',
  suffix = '',
  onClick,
  className,
}: StatCardProps) {
  // 数字动画：安全起见，无效数字fallback为0
  const safeValue = typeof value === 'number' && isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const prevValueRef = useRef(safeValue);

  const colors = COLOR_CONFIG[color];
  const isClickable = typeof onClick === 'function';

  // 数字计数动画：每次safeValue变化都从当前显示值过渡到目标值
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = prevValueRef.current;
    const endValue = safeValue;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      prevValueRef.current = endValue;
      return;
    }

    const duration = Math.min(600, 150 + Math.abs(endValue - startValue) * 8);
    const startTime = performance.now();
    setIsAnimating(true);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.round(
        startValue + (endValue - startValue) * easedProgress
      );

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [safeValue]);

  // 格式化显示数字
  const formattedValue = displayValue.toLocaleString('zh-CN');

  return (
    <div
      onClick={onClick}
      className={cn(
        // 基础样式
        'group relative bg-white rounded-lg border border-slate-200 p-5',
        // 阴影和过渡动画
        'shadow-card hover:shadow-card-hover transition-all duration-300',
        // hover 时的位移和边框效果
        'hover:-translate-y-0.5 hover:border-opacity-0',
        // 颜色强调边框
        `border-l-[3px] ${colors.accent.replace('border-', 'border-l-')}`,
        // 可点击样式
        isClickable && 'cursor-pointer active:translate-y-0 active:shadow-card',
        className
      )}
    >
      {/* 顶部光晕效果（hover 时显示） */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg ring-4 ring-transparent transition-all duration-300 pointer-events-none',
          colors.ring
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        {/* 左侧文字内容 */}
        <div className="flex-1 min-w-0">
          {/* 标签名称 */}
          <p className="text-sm font-medium text-slate-500 mb-2 truncate">
            {label}
          </p>

          {/* 大数字（JetBrains Mono 字体） */}
          <p
            className={cn(
              'font-mono font-bold text-3xl leading-tight tracking-tight animate-count-up',
              colors.value,
              isAnimating && 'tabular-nums'
            )}
          >
            {prefix}
            {formattedValue}
            {suffix}
          </p>

          {/* 底部趋势小字 */}
          {trend && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {trend.isPositive === true ? (
                <>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  </span>
                  <span className="text-emerald-700 font-medium">
                    +{trend.value.toFixed(1)}%
                  </span>
                </>
              ) : trend.isPositive === false ? (
                <>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50">
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  </span>
                  <span className="text-red-700 font-medium">
                    -{Math.abs(trend.value).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50">
                    <Minus className="w-3 h-3 text-slate-500" />
                  </span>
                  <span className="text-slate-600 font-medium">
                    {trend.value.toFixed(1)}%
                  </span>
                </>
              )}
              {trend.label && (
                <span className="text-slate-400 ml-0.5">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 右侧图标圆框 */}
        <div
          className={cn(
            // 基础样式
            'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            // 背景和颜色
            colors.bg,
            colors.icon,
            // 过渡动画
            'transition-all duration-300 ease-out',
            // hover 时的放大和旋转效果
            'group-hover:scale-110 group-hover:rotate-3'
          )}
        >
          <Icon className="w-6 h-6 transition-transform duration-300" />
        </div>
      </div>
    </div>
  );
}
