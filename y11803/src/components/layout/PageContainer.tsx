import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <main className={`flex-1 bg-slate-50 p-6 overflow-auto ${className}`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {children}
      </div>
    </main>
  );
}
