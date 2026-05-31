import { cn } from '@/lib/utils';
import { Activity, ListTodo, BarChart3, History, Menu, X, Home } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '任务管理', icon: ListTodo },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/about', label: '关于', icon: Activity },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-primaryDark text-white flex">
      <aside
        className={cn(
          'bg-primary/50 backdrop-blur-sm border-r border-accent/20 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="p-4 border-b border-accent/20 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accentDark flex items-center justify-center">
                <BarChart3 size={24} className="text-primaryDark" />
              </div>
              <div>
                <h1 className="font-bold text-lg">风场返航</h1>
                <p className="text-xs text-gray-400">Drone Wind Calculation</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accentDark flex items-center justify-center mx-auto">
              <BarChart3 size={24} className="text-primaryDark" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent/20 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-accent/20 text-accent border-l-2 border-accent'
                    : 'text-gray-400 hover:bg-accent/10 hover:text-white'
                )}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-accent/20">
            <div className="text-xs text-gray-500">v1.0.0</div>
            <div className="text-xs text-gray-600 mt-1">历史记录自动持久化</div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-primary/30 backdrop-blur-sm border-b border-accent/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {navItems.find((n) => n.path === location.pathname)?.label || '风场返航计算'}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {location.pathname === '/' && '导入数据包，运行返航能耗计算'}
              {location.pathname === '/history' && '查看所有历史计算记录，包含重复检测'}
              {location.pathname === '/about' && '系统信息与使用说明'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
            >
              <Home size={18} />
              <span className="hidden md:inline">返回首页</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
