import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, MapPin, Calculator, FileBarChart, Bus 
} from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { path: '/', label: '仪表盘', icon: Home },
  { path: '/employees', label: '员工住址', icon: Users },
  { path: '/stations', label: '站点候选', icon: MapPin },
  { path: '/scheduling', label: '整数规划', icon: Calculator },
  { path: '/reports', label: '调度报告', icon: FileBarChart },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">班车排程系统</h1>
              <p className="text-xs text-gray-500">整数规划优化</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
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
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium">容量超限告警</p>
          <p className="text-xs text-amber-600 mt-1">
            当前有 1 条待处理记录</p>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {navItems.find(item => item.path === location.pathname)?.label || '仪表盘'}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">园区行政</p>
                <p className="text-xs text-gray-500">管理员</p>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </header>
        
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
