import { ReactNode } from 'react';

/**
 * 徽章组件属性接口
 */
interface BadgeProps {
  /** 徽章样式变体 */
  variant?: 'info' | 'success' | 'warn' | 'danger' | 'neutral';
  /** 徽章内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 状态标签徽章组件
 * 不同变体对应不同颜色主题
 */
export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  /** 变体样式映射 */
  const variantClasses: Record<string, string> = {
    info: 'bg-deep-ocean/10 text-deep-ocean',
    success: 'bg-life-green/15 text-life-green',
    warn: 'bg-amber-warn/15 text-amber-warn',
    danger: 'bg-corral-severe/15 text-corral-severe',
    neutral: 'bg-paper-dark text-deep-ocean/70',
  };

  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
