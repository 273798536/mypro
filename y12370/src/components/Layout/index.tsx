import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-primary-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
