import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useExperimentStore } from '@/store/useExperimentStore';

export const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const init = useExperimentStore(state => state.init);
  const navigate = useNavigate();
  
  useEffect(() => {
    init();
  }, [init]);
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      
      <div className="lg:hidden fixed inset-0 bg-black/50 z-40" style={{ display: 'none' }}>
        <Sidebar />
      </div>
    </div>
  );
};
