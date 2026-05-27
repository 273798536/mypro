import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, AlertTriangle, Download, Dumbbell } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: '返利概览', icon: LayoutDashboard },
  { path: '/details', label: '返利明细', icon: ListTodo },
  { path: '/disputes', label: '争议清单', icon: AlertTriangle },
  { path: '/export', label: '报告导出', icon: Download },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold">跨店返利</h1>
              <p className="text-xs text-white/60">会员返利管理系统</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">管</span>
            </div>
            <div>
              <p className="text-sm font-medium">销售主管</p>
              <p className="text-xs text-white/50">admin@gym.com</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
