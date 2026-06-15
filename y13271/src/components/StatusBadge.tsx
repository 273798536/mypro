// 状态徽章组件 - 根据 BayStatus 显示不同颜色圆点+文字
import type { BayStatus } from '../types';
import { cn } from '../lib/utils';

// 状态配置类型
interface StatusConfig {
  label: string; // 显示文本
  dotColor: string; // 圆点颜色
  bgColor: string; // 背景色
  textColor: string; // 文字颜色
  borderColor: string; // 边框颜色
  dotPulse?: boolean; // 是否有脉冲动画（用于异常/待复核）
  icon?: React.ReactNode; // 可选图标
}

// 状态配置映射
const STATUS_CONFIG: Record<BayStatus, StatusConfig> = {
  normal: {
    label: '正常',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  abnormal: {
    label: '异常',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotPulse: true,
  },
  pending: {
    label: '待复核',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotPulse: true,
  },
};

// 组件 Props 定义
export interface StatusBadgeProps {
  status: BayStatus; // 站点状态
  showDot?: boolean; // 是否显示左侧圆点（默认 true）
  size?: 'sm' | 'md' | 'lg'; // 徽章尺寸
  variant?: 'solid' | 'outline' | 'soft'; // 显示样式变体
  showIcon?: boolean; // 是否显示辅助图标（替代圆点）
  className?: string; // 自定义外层样式
  onClick?: () => void; // 点击事件
}

// 尺寸配置
const SIZE_CONFIG: Record<
  NonNullable<StatusBadgeProps['size']>,
  {
    padding: string;
    text: string;
    dot: string;
    spacing: string;
  }
> = {
  sm: {
    padding: 'px-1.5 py-0.5',
    text: 'text-[11px]',
    dot: 'w-1.5 h-1.5',
    spacing: 'gap-1',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-xs',
    dot: 'w-2 h-2',
    spacing: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
    spacing: 'gap-2',
  },
};

export function StatusBadge({
  status,
  showDot = true,
  size = 'md',
  variant = 'soft',
  showIcon = false,
  className,
  onClick,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  const isClickable = typeof onClick === 'function';

  // 根据变体确定样式类
  const variantClasses = {
    // 柔和样式（默认）：浅色背景 + 边框
    soft: cn(
      config.bgColor,
      config.textColor,
      'border',
      config.borderColor
    ),
    // 实心样式：纯色背景 + 白色文字
    solid: cn(
      status === 'normal' && 'bg-emerald-600 text-white border border-emerald-600',
      status === 'abnormal' && 'bg-red-600 text-white border border-red-600',
      status === 'pending' && 'bg-amber-600 text-white border border-amber-600'
    ),
    // 轮廓样式：透明背景 + 彩色边框 + 彩色文字
    outline: cn(
      'bg-transparent',
      config.textColor,
      'border',
      config.borderColor
    ),
  }[variant];

  // 圆点颜色（根据变体调整）
  const dotColorClass =
    variant === 'solid'
      ? status === 'normal'
        ? 'bg-white'
        : status === 'abnormal'
        ? 'bg-white'
        : 'bg-white'
      : config.dotColor;

  return (
    <span
      onClick={onClick}
      className={cn(
        // 基础布局
        'inline-flex items-center justify-center',
        sizeConfig.padding,
        sizeConfig.spacing,
        // 字体
        'font-medium rounded-md leading-none whitespace-nowrap',
        // 变体样式
        variantClasses,
        // 过渡动画
        'transition-all duration-200',
        // 可点击样式
        isClickable &&
          'cursor-pointer hover:shadow-md active:scale-[0.97] hover:-translate-y-px',
        className
      )}
      title={`当前状态：${config.label}`}
    >
      {/* 左侧圆点或图标 */}
      {showDot && !showIcon && (
        <span className="relative inline-flex shrink-0">
          {/* 脉冲动画外环（异常和待复核状态） */}
          {config.dotPulse && variant !== 'solid' && (
            <span
              className={cn(
                'absolute inline-flex rounded-full opacity-75 animate-ping',
                sizeConfig.dot,
                config.dotColor
              )}
              style={{ animationDuration: '1.5s' }}
            />
          )}
          {/* 核心圆点 */}
          <span
            className={cn(
              'inline-flex rounded-full relative',
              sizeConfig.dot,
              dotColorClass,
              // 变体为 solid 时添加内部光晕
              variant === 'solid' &&
                status !== 'normal' &&
                'ring-2 ring-white/40'
            )}
          />
        </span>
      )}

      {/* 辅助图标（替代圆点） */}
      {showIcon && (
        <span className="shrink-0">
          {status === 'normal' && (
            <svg
              className={cn(
                'text-current',
                size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {status === 'abnormal' && (
            <svg
              className={cn(
                'text-current',
                size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {status === 'pending' && (
            <svg
              className={cn(
                'text-current',
                size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
        </span>
      )}

      {/* 状态文字 */}
      <span className={cn(sizeConfig.text, 'tracking-wide')}>
        {config.label}
      </span>
    </span>
  );
}
