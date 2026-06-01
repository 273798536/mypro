import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Beaker, 
  Layers, 
  History, 
  Database, 
  Download,
  BookOpen,
  Infinity
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: '实验工作台', icon: Beaker },
  { path: '/batch', label: '批量计算', icon: Layers },
  { path: '/history', label: '历史档案', icon: History },
  { path: '/samples', label: '样例库', icon: BookOpen },
  { path: '/export', label: '导出中心', icon: Download },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-ivory flex">
      <aside className="w-64 bg-primary text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-primary-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Infinity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif-title text-lg font-bold">分形迭代</h1>
              <p className="text-xs text-white/70">课堂板</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-primary shadow-lg'
                        : 'hover:bg-primary-light text-white/90 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-primary-light">
          <div className="bg-primary-dark rounded-lg p-4">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
              <Database className="w-4 h-4" />
              <span>数据状态</span>
            </div>
            <p className="text-white text-sm font-medium">本地存储</p>
            <p className="text-white/60 text-xs mt-1">所有数据保存在浏览器中</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif-title font-bold text-neutral-dark">
                {navItems.find((n) => n.path === location.pathname)?.label || '分形迭代课堂板'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">数学课堂工具</p>
                <p className="text-xs text-gray-400">v1.0.0</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
