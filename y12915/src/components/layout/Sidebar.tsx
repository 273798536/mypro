import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  PencilLine,
  GitCompare,
  Table2,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: '总览仪表盘', Icon: LayoutDashboard },
  { to: '/confidence', label: '置信区间分析', Icon: BarChart3 },
  { to: '/correction', label: '人工修正工作台', Icon: PencilLine },
  { to: '/gray-compare', label: '灰度版本对比', Icon: GitCompare },
  { to: '/distribution', label: '分布统计', Icon: Table2 },
  { to: '/safety-rules', label: '安全规则校验', Icon: ShieldCheck },
  { to: '/export', label: '导出中心', Icon: Download },
];

export default function Sidebar() {
  return (
    <aside className="h-screen w-[260px] bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-lg font-display font-bold tracking-wide text-sky-400">
          评测置信区间
        </h1>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all',
                    'hover:bg-slate-800 hover:text-sky-300',
                    isActive
                      ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40 shadow-inner shadow-sky-900/50'
                      : 'text-slate-300 border border-transparent'
                  )
                }
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
        <div className="font-mono text-slate-400">Version v2.3.1</div>
        <div className="mt-1">Build 2026.06.17</div>
      </div>
    </aside>
  );
}
