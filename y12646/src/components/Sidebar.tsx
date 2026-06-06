import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Crosshair,
  Cpu,
  BarChart3,
  Layers,
  FileText,
  Stethoscope,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '穴位画布', icon: Crosshair },
  { to: '/devices', label: '设备清单', icon: Cpu },
  { to: '/analysis', label: '复盘分析', icon: BarChart3 },
  { to: '/layers', label: '图层管理', icon: Layers },
  { to: '/examples', label: '样例复核', icon: FileText },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen bg-white border-r border-ink-100 flex flex-col">
      <div className="px-5 py-5 border-b border-ink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-medical-600 flex items-center justify-center shadow-soft">
            <Stethoscope className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-base font-semibold text-ink-900 leading-tight">
              穴位练习画布
            </div>
            <div className="text-xs text-ink-400 mt-0.5">康复训练评审系统</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
          工作台
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('nav-link', isActive && 'nav-link-active')
            }
          >
            <item.icon className="w-4.5 h-4.5" strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-ink-100">
        <div className="px-3.5 py-3 rounded-xl bg-ink-50/60 border border-ink-100/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-medical-400 to-medical-600 flex items-center justify-center text-white text-sm font-medium">
              王
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-800 truncate">王训练师</div>
              <div className="text-xs text-ink-400 truncate">康复科 · 高级培训师</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
