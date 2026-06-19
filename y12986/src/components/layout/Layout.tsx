import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, ShieldCheck, Activity, PlaySquare, GitBranch } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    to: '/',
    label: '重放任务',
    icon: <PlaySquare className="w-4 h-4" />,
    desc: '任务列表与异常筛选',
  },
  {
    to: '/audit',
    label: '权限审计',
    icon: <ShieldCheck className="w-4 h-4" />,
    desc: '变更对比与影响分析',
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/' || location.pathname.startsWith('/task');
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-primary-600 text-white shadow-md no-print">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center">
                <GitBranch className="w-4.5 h-4.5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">
                  事件溯源重放 API · 审计工作台
                </h1>
                <p className="text-[11px] text-white/70 leading-tight">
                  Event Sourcing Replay Audit Console · v1.0
                </p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium border-2 transition-colors',
                    active
                      ? 'bg-white text-primary-600 border-white'
                      : 'border-transparent text-white/90 hover:bg-white/10',
                  ].join(' ')}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-white/80">
              <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse-slow" />
              <span className="font-mono">SYSTEM OK</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/15 border border-white/25 flex items-center justify-center text-xs font-bold">
                张明
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium">DBA · 数据平台</span>
                <span className="text-[10px] text-white/60 font-mono">id:U-20250318</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>

      <footer className="bg-white border-t border-gray-200 px-6 py-2 text-[11px] text-gray-500 flex items-center justify-between no-print">
        <div className="flex items-center gap-4 font-mono">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-primary-500" />
            DB_CONN: order-mysql-master · 284万行
          </span>
          <span>·</span>
          <span>权限策略版本: PERM-V2026.06.18</span>
        </div>
        <div>
          数据平台 · 内部工具 · 仅限授权用户使用
        </div>
      </footer>
    </div>
  );
};
