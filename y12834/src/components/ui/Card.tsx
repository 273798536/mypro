import { ReactNode, MouseEvent } from 'react';

/**
 * 卡片组件属性接口
 */
interface CardProps {
  /** 卡片内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 点击事件回调 */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 是否启用悬停效果 */
  hoverable?: boolean;
}

/**
 * 卡片组件
 * 带阴影的容器组件，可选择悬停上浮效果
 */
export function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
}: CardProps) {
  /** 悬停效果样式 */
  const hoverClass = hoverable
    ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lift transition-all duration-200'
    : '';

  return (
    <div
      className={`card ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
