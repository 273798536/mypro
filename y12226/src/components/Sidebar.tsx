import { NavLink, useLocation } from 'react-router-dom';
import { Home, HeartHandshake, Calculator, FileText, Lock, BarChart3, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  route: string;
}

const navItems: NavItem[] = [
  { label: '首页', icon: Home, route: '/' },
  { label: '捐赠记录', icon: HeartHandshake, route: '/donations' },
  { label: '项目预算', icon: Calculator, route: '/budgets' },
  { label: '支出票据', icon: FileText, route: '/receipts' },
  { label: '用途锁定', icon: Lock, route: '/lock' },
  { label: '公开报告', icon: BarChart3, route: '/report' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-800 flex flex-col z-50">
      <div className="flex-1 py-6">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-lg font-noto-serif-sc">思源公益</span>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.route;
            return (
              <NavLink
                key={item.route}
                to={item.route}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium font-noto-serif-sc">思源公益基金会</p>
            <p className="text-slate-400 text-xs">Siyuan Foundation</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
