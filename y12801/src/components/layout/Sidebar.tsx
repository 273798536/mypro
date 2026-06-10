import { NavLink } from 'react-router-dom';
import { Dna, LayoutDashboard, ScrollText, User } from 'lucide-react';
import type { CurrentUser } from '@/types';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '批次总览' },
  { to: '/audit', icon: ScrollText, label: '审计日志' },
];

const roleLabels: Record<CurrentUser['role'], string> = {
  breeder: '育种专员',
  supervisor: '审核主管',
};

interface SidebarProps {
  currentUser: CurrentUser;
}

export default function Sidebar({ currentUser }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-teal-700/30 bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-6 py-5">
        <Dna className="h-7 w-7 text-teal-400" />
        <h1 className="text-lg font-semibold text-white">单细胞聚类批次复核</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
            <User className="h-5 w-5 text-slate-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">{currentUser.name}</span>
            <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-xs text-teal-300">
              {roleLabels[currentUser.role]}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
