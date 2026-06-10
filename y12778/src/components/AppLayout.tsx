import { NavLink, Outlet } from 'react-router-dom';
import { FlaskConical, Layers, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export function AppLayout() {
  const navItems = [
    { path: '/', label: '异常留痕', icon: AlertTriangle, desc: '日常入口' },
    { path: '/batch-tracking', label: '批次追踪', icon: Layers, desc: '月底/课前' },
    { path: '/reagent-ledger', label: '试剂台账', icon: BookOpen, desc: '录入/补录' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-navy-600 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div>
                <div className="font-serif font-bold text-slate-800 leading-tight text-[15px]">
                  表面张力浓度试算
                </div>
                <div className="text-[10px] text-slate-500 tracking-wider uppercase leading-tight">
                  QC Traceability System
                </div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => cn(
                      'group relative flex items-center gap-2 px-3.5 py-2 rounded transition-colors',
                      isActive
                        ? 'bg-navy-50 text-navy-700'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      item.path === '/' ? 'bg-status-pending/10 text-status-pending' :
                      item.path === '/batch-tracking' ? 'bg-navy-600/10 text-navy-600' :
                      'bg-accent-500/10 text-accent-600'
                    )}>
                      {item.desc}
                    </span>
                    {item.path === '/' && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-navy-600 rounded-full opacity-0 group-[.active]:opacity-100 transition-opacity" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                质检
              </div>
            </div>
          </div>
          <nav className="flex md:hidden items-center gap-1 pb-2 -mx-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-navy-50 text-navy-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="container mx-auto px-4 lg:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              表面张力浓度试算系统 · 结果可解释 · 过程可追溯 · 数据不重复
            </p>
            <p className="text-xs text-slate-400 font-mono">
              © 2026 QC Lab Traceability
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
