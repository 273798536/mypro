import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/store/useAppStore';

export const MainLayout: React.FC = () => {
  const loadInitialData = useAppStore((state) => state.loadInitialData);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
