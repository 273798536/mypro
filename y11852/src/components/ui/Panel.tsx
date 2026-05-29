import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, title, icon, collapsible, defaultCollapsed = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl overflow-hidden',
          'shadow-xl shadow-black/20',
          className
        )}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              {icon && <span className="text-zinc-400">{icon}</span>}
              <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">{title}</h3>
            </div>
          </div>
        )}
        <div className="overflow-auto">{children}</div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';
