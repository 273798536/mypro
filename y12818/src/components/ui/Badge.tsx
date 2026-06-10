import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// 状态徽章类型
export type BadgeVariant =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'warning'
  | 'danger'
  | 'success';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showIcon?: boolean;
}

// 徽章样式配置
const variantConfig: Record<
  BadgeVariant,
  { styles: string; icon: typeof Clock; label: string }
> = {
  pending: {
    styles:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    icon: Clock,
    label: '待处理',
  },
  approved: {
    styles:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
    icon: CheckCircle2,
    label: '已通过',
  },
  rejected: {
    styles:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
    label: '已拒绝',
  },
  warning: {
    styles:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800',
    icon: AlertTriangle,
    label: '警告',
  },
  danger: {
    styles:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    icon: AlertCircle,
    label: '危险',
  },
  success: {
    styles:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle,
    label: '成功',
  },
};

// 状态徽章组件
export default function Badge({
  variant = 'pending',
  showIcon = true,
  className,
  children,
  ...props
}: BadgeProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
        config.styles,
        className,
      )}
      {...props}
    >
      {showIcon && <Icon size={12} className="shrink-0" />}
      {children || config.label}
    </span>
  );
}
