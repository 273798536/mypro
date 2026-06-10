import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/samples': '样本管理',
  '/qc': '质控中心',
  '/analysis': '差异分析',
  '/reports': '报告中心',
  '/test-scenarios': '测试场景',
};

export default function MainLayout() {
  const { sidebarCollapsed } = useUIStore();
  const currentPath = window.location.pathname;
  const title = pageTitles[currentPath] || '实验管理系统';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarCollapsed ? 'ml-0' : 'ml-0'
        )}
      >
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
