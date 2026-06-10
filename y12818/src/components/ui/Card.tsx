import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  gradient?: boolean;
}

// 带噪点纹理和渐变效果的卡片组件
export default function Card({
  children,
  className,
  hoverable = false,
  gradient = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300',
        'dark:border-slate-800 dark:bg-slate-900',
        hoverable &&
          'hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700',
        className,
      )}
      {...props}
    >
      {/* 噪点纹理覆盖层 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      {/* 渐变背景层 */}
      {gradient && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(236, 72, 153, 0.04) 100%)',
          }}
          aria-hidden="true"
        />
      )}

      {/* 卡片内容 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
