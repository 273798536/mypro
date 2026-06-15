import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  History,
  Menu,
  X,
  Zap,
  Download,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/', label: '方案比选', icon: LayoutDashboard },
  { path: '/ledger', label: '审批台账', icon: FileText },
  { path: '/review', label: '待复核点位', icon: ClipboardCheck },
  { path: '/history', label: '历史记录', icon: History },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const currentPage = menuItems.find((item) => item.path === location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } bg-primary-900 text-white transition-all duration-200 flex flex-col fixed h-full z-20`}
      >
        <div className="h-14 flex items-center px-4 border-b border-primary-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-sm flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-sm truncate">社区充电方案比选</span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-primary-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-primary-700/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 text-primary-300 hover:text-white transition-colors"
            title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-56' : 'ml-16'} transition-all duration-200`}>
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {currentPage?.label || '方案比选'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-xs">
              <Download className="w-4 h-4 mr-1" />
              导出
            </button>
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-sm font-medium">
              何
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
