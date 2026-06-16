import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, FileDown, Flame, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: '归并工作台' },
    { path: '/history', icon: History, label: '归并历史' },
    { path: '/export', icon: FileDown, label: '数据导出' },
  ];

  return (
    <nav className="bg-primary-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center shadow-glow">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">
                老街消防点位归并
              </h1>
              <p className="text-primary-200 text-xs">Fire Point Merge System</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/15 text-white shadow-inner'
                      : 'text-primary-200 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">运营主管</div>
              <div className="text-primary-300 text-xs">当前登录</div>
            </div>
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center border-2 border-primary-400">
              <User className="w-5 h-5 text-primary-100" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
