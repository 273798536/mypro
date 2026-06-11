import { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * 按钮组件属性接口
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮样式变体 */
  variant?: 'primary' | 'secondary' | 'warn' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 按钮内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 按钮组件
 * 根据 variant 应用不同的预设样式（参考 index.css 中的 btn-* 类）
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  /** 尺寸样式映射 */
  const sizeClasses: Record<string, string> = {
    sm: 'text-sm px-3 py-1.5',
    md: '',
    lg: 'text-lg px-6 py-3',
  };

  /** 禁用状态样式 */
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`btn-${variant} ${sizeClasses[size]} ${disabledClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
