import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useAppStore from '@/store/useAppStore';

const MainLayout = () => {
  const { instruments, loadMockData } = useAppStore();

  useEffect(() => {
    if (instruments.length === 0) {
      loadMockData();
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-midnight-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
