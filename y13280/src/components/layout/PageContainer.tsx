import type { ReactNode } from "react";
import clsx from "clsx";

interface PageContainerProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  subtitle,
  headerActions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={clsx("p-6 max-w-[1800px] mx-auto", className)}>
      <div className="flex items-end justify-between gap-4 mb-5 animate-fade-up">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
          </div>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
