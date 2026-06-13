import { NavLink } from 'react-router-dom';
import { Database, Table, AlertTriangle, ShieldCheck, History } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: '报告导出首页', icon: Database },
  { to: '/detail', label: '明细数据', icon: Table },
  { to: '/verify', label: '边界校验', icon: ShieldCheck },
  { to: '/exceptions', label: '异常中心', icon: AlertTriangle },
];

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-[#0f2440]">
      <aside className="w-64 bg-[#1e3a5f] border-r-2 border-[#2d5a8e] flex flex-col flex-shrink-0">
        <div className="p-5 border-b-2 border-[#2d5a8e]">
          <h1 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
            <History className="w-5 h-5 text-[#5a9fd4]" />
            <span>梁体挠度报告</span>
          </h1>
          <p className="text-[#8ba7c7] text-xs mt-1">导出与追溯系统</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm transition-colors border-l-4 ${
                    isActive
                      ? 'bg-[#2d5a8e]/30 text-white border-[#5a9fd4]'
                      : 'text-[#8ba7c7] hover:bg-[#2d5a8e]/20 hover:text-white border-transparent'
                  }`
                }
                end
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-[#2d5a8e]">
          <div className="text-[#8ba7c7] text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>系统运行中</span>
            </div>
            <div className="font-mono text-[#5a9fd4]">v2.1.0</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
