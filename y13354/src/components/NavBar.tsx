import { NavLink } from 'react-router-dom';
import { Shield, Table, History, FlaskConical } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function NavBar() {
  const { isDemoMode, toggleDemoMode, currentSnapshot } = useGatekeeperStore();

  const navItems = [
    { to: '/', label: '守门总览', icon: Shield },
    { to: '/samples', label: '样本明细', icon: Table },
    { to: '/history', label: '历史追踪', icon: History },
  ];

  return (
    <nav className="fixed left-0 top-0 z-30 h-screen w-60 border-r border-slate-700/60 bg-slate-900 px-4 py-6">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-white tracking-tight">向量守门</h1>
          <p className="text-[10px] text-slate-400">Gatekeeper v1.0</p>
        </div>
      </div>

      {currentSnapshot && (
        <div className="mb-6 rounded-lg border border-slate-700/60 bg-slate-800/50 p-3">
          <p className="text-[11px] text-slate-400">当前快照</p>
          <p className="mt-1 truncate text-[13px] font-semibold text-white">{currentSnapshot.version}</p>
          <p className="truncate text-[11px] text-slate-400">{currentSnapshot.name}</p>
        </div>
      )}

      <ul className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 shadow-inner'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="absolute bottom-6 left-4 right-4">
        <button
          onClick={toggleDemoMode}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all duration-200',
            isDemoMode
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          )}
        >
          <FlaskConical className="h-4 w-4" />
          {isDemoMode ? '演示模式：开启' : '演示模式：关闭'}
        </button>
      </div>
    </nav>
  );
}
