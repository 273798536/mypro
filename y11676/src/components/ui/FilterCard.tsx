import { ReactNode } from 'react';

interface FilterCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function FilterCard({ title, subtitle, icon, children }: FilterCardProps) {
  return (
    <div className="glass-card p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="text-emerald-400">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}