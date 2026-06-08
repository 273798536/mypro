
import { Home, Calculator, Image, History, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: '数据仪表盘' },
    { path: '/calculator', icon: Calculator, label: '计算工具' },
    { path: '/compare', icon: Image, label: '剖面图对比' },
    { path: '/history', icon: History, label: '历史记录' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          工业机器人臂展校验
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
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
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          <p>当前用户</p>
          <p className="text-slate-500 text-xs mt-1">质量检验部</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
