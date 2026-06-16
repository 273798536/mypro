import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-6 pb-4 border-b border-municipal-100">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-municipal-800 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-municipal-500 mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
