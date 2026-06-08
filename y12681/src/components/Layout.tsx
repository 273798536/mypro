import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-space-950 starfield-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
