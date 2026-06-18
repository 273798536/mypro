import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Upload,
  FolderOpen,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { relativeTime } from '@/utils/format';
import { SaveIndicator } from './SaveIndicator';

export function AppLayout() {
  const { session, saveStatus, resetSession } = useReviewStore();

  const navItems = [
    { to: '/workbench', label: '复核工作台', icon: LayoutDashboard },
    { to: '/history', label: '历史时间线', icon: Clock },
    { to: '/import', label: '数据导入', icon: Upload },
    { to: '/sessions', label: '会话管理', icon: FolderOpen },
  ];

  return (
    <div className="h-full flex bg-deep-ocean bg-grid">
      <aside className="w-60 flex-shrink-0 border-r border-slate-700/50 flex flex-col glass-strong">
        <div className="p-5 border-b border-slate-700/50">
          <h1 className="font-display text-lg font-bold text-gradient">
            属性证据复核
          </h1>
          <p className="text-xs text-slate-400 mt-1">{session.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-accent/15 text-cyan-accent font-medium'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>上次更新</span>
            <span>{relativeTime(session.updatedAt)}</span>
          </div>
          <SaveIndicator status={saveStatus} />
          <button
            onClick={resetSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-rose-alert hover:bg-rose-alert/10 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            重置为示例数据
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
