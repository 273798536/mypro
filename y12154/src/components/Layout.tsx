import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  Filter,
  Calculator,
  AlertTriangle,
  BarChart3,
  FileDown,
  Settings,
  Menu,
  X,
  Database,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useDataStore } from '../stores/dataStore';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const MENU_ITEMS = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/cleaning', label: '数据清洗', icon: Filter },
  { path: '/calculation', label: '验算结果', icon: Calculator },
  { path: '/review', label: '异常复核', icon: AlertTriangle },
  { path: '/charts', label: '图表分析', icon: BarChart3 },
  { path: '/export', label: '报告导出', icon: FileDown },
  { path: '/settings', label: '系统设置', icon: Settings },
];

const iconMap: Record<string, React.FC<any>> = {
  LayoutDashboard,
  FileUp,
  Filter,
  Calculator,
  AlertTriangle,
  BarChart3,
  FileDown,
  Settings,
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { records, abnormalities, badRows, loadDemoData, clearAllData, isLoading } = useDataStore();

  const getBadgeForPath = (path: string) => {
    if (path === '/calculation' && records.length > 0) {
      return records.length;
    }
    if (path === '/review') {
      const count = abnormalities.filter(a => a.abnormalLevel !== 'normal').length;
      return count > 0 ? count : undefined;
    }
    if (path === '/cleaning' && badRows.length > 0) {
      return badRows.length;
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">电梯制动验算</h1>
                <p className="text-xs text-slate-500">专业版</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {MENU_ITEMS.map(item => {
            const Icon = iconMap[item.icon.name] || LayoutDashboard;
            const badge = getBadgeForPath(item.path);
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', !sidebarOpen && 'mx-auto')} />
                {sidebarOpen && (
                  <>
                    <span className="ml-3">{item.label}</span>
                    {badge !== undefined && (
                      <Badge
                        variant={isActive ? 'danger' : 'warning'}
                        size="sm"
                        className="ml-auto"
                      >
                        {badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {sidebarOpen && records.length === 0 && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-blue-700 mb-2">暂无数据，快速开始：</p>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={loadDemoData}
                  isLoading={isLoading}
                  leftIcon={<Database className="w-4 h-4" />}
                >
                  加载演示数据
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <NavLink to="/import">
                    <FileUp className="w-4 h-4 mr-2" />
                    导入数据文件
                  </NavLink>
                </Button>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen && records.length > 0 && (
          <div className="absolute bottom-4 left-3 right-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={clearAllData}
              isLoading={isLoading}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              清空所有数据
            </Button>
          </div>
        )}
      </aside>

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {MENU_ITEMS.find(m => m.path === location.pathname)?.label || '仪表盘'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">特种设备检验员</p>
              <p className="text-xs text-slate-500">系统管理员</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-600">检验</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
