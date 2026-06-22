import type { ReactNode } from 'react';
import { FilterPanel } from '../dashboard/FilterPanel';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex bg-ink-50">
      <FilterPanel />
      <main className="flex-1 min-w-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
