import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';

export default function MainLayout() {
  const initData = useBackupStore((state) => state.initData);

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <div className="flex min-h-screen bg-noise">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
