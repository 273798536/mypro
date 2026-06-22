import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md';
}

export function IconButton({
  icon,
  children,
  variant = 'ghost',
  size = 'sm',
  className = '',
  ...rest
}: IconButtonProps) {
  const sizeCls =
    size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  const variantCls = {
    primary:
      'bg-ink-700 text-white border-2 border-ink-700 hover:bg-ink-800 active:translate-y-px',
    ghost:
      'bg-white text-ink-700 border-2 border-ink-300 hover:bg-ink-50 hover:border-ink-400 active:translate-y-px',
    danger:
      'bg-white text-amber-600 border-2 border-amber-400 hover:bg-amber-50 active:translate-y-px',
    warning:
      'bg-amber-50 text-amber-600 border-2 border-amber-400 hover:bg-amber-100 active:translate-y-px',
  }[variant];

  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 font-mono font-medium transition-all select-none ${sizeCls} ${variantCls} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
