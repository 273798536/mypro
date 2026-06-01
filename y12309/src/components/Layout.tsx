import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { sidebarCollapsed } = useStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">图论巡检换班器</h1>
              <p className="text-sm text-slate-500 mt-1">智能巡检排班管理系统</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">工程主管</div>
                <div className="text-xs text-slate-500">系统管理员</div>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                管
              </div>
            </div>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
