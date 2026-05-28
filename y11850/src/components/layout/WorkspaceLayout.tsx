import { ReactNode } from 'react';
import { ValidationBar } from '@/components/ui/ValidationBar';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { Sidebar } from '@/components/ui/Sidebar';

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-deep-ocean overflow-hidden">
      <ValidationBar />
      
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
        
        <Sidebar />
      </div>
    </div>
  );
}
