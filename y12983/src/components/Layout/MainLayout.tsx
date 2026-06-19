import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
