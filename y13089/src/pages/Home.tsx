import { useLightingStore } from '@/store/lightingStore';
import { cn } from '@/lib/utils';
import FilterBar from '@/components/FilterBar';
import PointList from '@/components/PointList';
import PointDetail from '@/components/PointDetail';
import ExceptionList from '@/components/ExceptionList';
import ExceptionDetail from '@/components/ExceptionDetail';
import Dashboard from '@/components/Dashboard';
import { Lightbulb, AlertTriangle, BarChart3, Layers } from 'lucide-react';

type ViewMode = 'list' | 'detail' | 'dashboard' | 'exceptions';

export default function Home() {
  const { viewMode, setViewMode, getProcessingStatus } = useLightingStore();
  const status = getProcessingStatus();

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: '项目总览', icon: <BarChart3 className="w-5 h-5" /> },
    {
      id: 'list',
      label: '点位管理',
      icon: <Lightbulb className="w-5 h-5" />,
      badge: status.pendingPoints
    },
    {
      id: 'exceptions',
      label: '异常队列',
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: status.pendingExceptions + status.evidenceNeededExceptions
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">博物馆展柜灯光方案比选</h1>
              <p className="text-sm text-blue-100">点位坐标审核与异常管理系统</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-blue-100">处理进度</p>
              <p className="font-medium">
                {status.processedPoints}/{status.totalPoints} 点位
                <span className="mx-2 text-blue-300">|</span>
                {status.resolvedExceptions}/{status.totalExceptions} 异常
              </p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <p className="text-blue-100">当前处理人</p>
              <p className="font-medium">评审助理 阿乔</p>
            </div>
          </div>
        </div>
        <nav className="bg-blue-800/30 border-t border-white/10">
          <div className="px-6 flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative",
                  viewMode === item.id
                    ? "text-white bg-white/10"
                    : "text-blue-100 hover:text-white hover:bg-white/5"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={cn(
                    "ml-1 px-2 py-0.5 text-xs rounded-full font-medium",
                    viewMode === item.id
                      ? "bg-white/20 text-white"
                      : "bg-red-500 text-white"
                  )}>
                    {item.badge}
                  </span>
                )}
                {viewMode === item.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'dashboard' ? (
          <Dashboard />
        ) : (
          <>
            <FilterBar />
            <div className="flex-1 flex overflow-hidden">
              {viewMode === 'list' && (
                <>
                  <div className="w-96 border-r border-gray-200 bg-white overflow-hidden">
                    <PointList />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PointDetail />
                  </div>
                </>
              )}
              {viewMode === 'exceptions' && (
                <>
                  <div className="w-96 border-r border-gray-200 bg-white overflow-hidden">
                    <ExceptionList />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ExceptionDetail />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 px-6 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>数据自动保存于本地浏览器，刷新页面后筛选条件、备注和异常队列将保持同步</span>
        <span>版本 v1.0.0 | 最后更新: 2026-06-13</span>
      </footer>
    </div>
  );
}