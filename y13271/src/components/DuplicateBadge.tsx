// 重复投诉徽章组件 - 橙色背景+脉冲呼吸动画，显示第N次重复
import { cn } from '../lib/utils';

// 组件 Props
export interface DuplicateBadgeProps {
  count: number; // 重复次数（>=2），例如2表示第2次重复
  showIcon?: boolean; // 是否显示重复图标
  size?: 'sm' | 'md'; // 徽章尺寸
  className?: string; // 自定义外层样式
  onClick?: () => void; // 点击事件
}

// 尺寸配置
const SIZE_CONFIG: Record<
  NonNullable<DuplicateBadgeProps['size']>,
  { padding: string; text: string; icon: string }
> = {
  sm: {
    padding: 'px-1.5 py-0.5',
    text: 'text-[10px]',
    icon: 'w-3 h-3',
  },
  md: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    icon: 'w-3.5 h-3.5',
  },
};

export function DuplicateBadge({
  count,
  showIcon = true,
  size = 'md',
  className,
  onClick,
}: DuplicateBadgeProps) {
  // 无效的重复次数（小于2时不显示）
  if (!count || count < 2) {
    return null;
  }

  const sizeConfig = SIZE_CONFIG[size];
  const isClickable = typeof onClick === 'function';

  return (
    <span
      onClick={onClick}
      className={cn(
        // 基础样式
        'inline-flex items-center gap-1 rounded-full font-semibold',
        // 橙色渐变背景
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        // 尺寸
        sizeConfig.padding,
        sizeConfig.text,
        // 脉冲呼吸动画
        'animate-pulse-badge',
        // 阴影
        'shadow-md shadow-amber-500/30',
        // 点击样式
        isClickable && 'cursor-pointer hover:shadow-lg hover:shadow-amber-500/40 active:scale-95 transition-all duration-200',
        className
      )}
      title={`该记录为第 ${count} 次重复投诉`}
    >
      {showIcon && (
        <svg
          className={cn(sizeConfig.icon, 'shrink-0')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 重复图标：两个重叠的文档 */}
          <path d="M8 18h10a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2" />
          <path d="M14 2v6h6" />
          <rect x="3" y="11" width="11" height="11" rx="2" />
        </svg>
      )}
      <span className="tracking-wide whitespace-nowrap">
        第{count}次重复
      </span>
    </span>
  );
}
