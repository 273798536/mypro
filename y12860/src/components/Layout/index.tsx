import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useTrackerStore } from '@/store/useTrackerStore';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { screenshotMode } = useTrackerStore();

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out',
          screenshotMode ? 'ml-0' : 'ml-64'
        )}
      >
        <TopBar />

        <main className="flex-1 overflow-auto">
          <div className="min-h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
