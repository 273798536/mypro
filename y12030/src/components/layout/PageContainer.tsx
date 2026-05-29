import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageContainer({
  title,
  subtitle,
  children,
  actions,
}: PageContainerProps) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{title}</h2>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div className="animate-[fadeIn_0.3s_ease]">{children}</div>
    </div>
  );
}
