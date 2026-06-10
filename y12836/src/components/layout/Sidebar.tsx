import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  GitBranch,
  AlertTriangle,
  FileText,
  Settings,
  FlaskRound as FlaskIcon,
  Microscope,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const navItems = [
  {
    to: '/',
    label: '工作台',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/samples',
    label: '样本管理',
    icon: FlaskConical,
  },
  {
    to: '/estimation',
    label: 'AI估算',
    icon: Activity,
  },
  {
    to: '/lineage',
    label: '谱系追踪',
    icon: GitBranch,
  },
  {
    to: '/anomalies',
    label: '异常处理',
    icon: AlertTriangle,
  },
  {
    to: '/compare/notes',
    label: '备注对比',
    icon: FileText,
  },
];

export default function Sidebar() {
  const anomalies = useAppStore((state) =>
    state.anomalies.filter((a) => a.status !== 'resolved').length
  );

  return (
    <aside className="w-60 h-screen bg-gradient-to-b from-brand-900 to-brand-950 text-white flex flex-col border-r border-brand-800">
      <div className="p-5 border-b border-brand-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
            <Microscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg leading-tight">IHC AI Lab</h1>
            <p className="text-xs text-brand-300">免疫组化智能估算平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner border border-white/10'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white border border-transparent'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/anomalies' && anomalies > 0 && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold bg-warning-500 text-white rounded-full">
                  {anomalies}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-800/60">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold">
            李
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">李检验师</p>
            <p className="text-xs text-brand-400 truncate">病理科 · 主治医师</p>
          </div>
          <button className="p-1.5 rounded-md hover:bg-white/10 text-brand-300 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
