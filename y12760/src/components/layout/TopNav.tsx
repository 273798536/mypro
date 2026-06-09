import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FlaskConical, Plus, Microscope, BookOpen, Shield, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/useUiStore';

const navItems = [
  { to: '/', label: '记录总览', icon: LayoutDashboard },
  { to: '/samples', label: '样例展示', icon: Microscope },
  { to: '/reports', label: '报告中心', icon: FileText },
];

export function TopNav() {
  const location = useLocation();
  const currentRole = useUiStore(s => s.currentRole);
  const setRole = useUiStore(s => s.setRole);

  const roleOptions: { value: typeof currentRole; label: string; icon: typeof Shield }[] = [
    { value: 'safety_officer', label: '安全员', icon: Shield },
    { value: 'researcher', label: '课题组', icon: Users },
    { value: 'guest', label: '访客', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-lab-100">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lab-600 to-lab-800 flex items-center justify-center shadow-soft group-hover:shadow-md transition-shadow">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-semibold text-lab-800 text-[15px]">气相色谱保留时间对齐</span>
              <span className="text-[11px] text-zinc-500">GC Retention Time Alignment</span>
            </div>
          </NavLink>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.to === '/' && location.pathname.startsWith('/record'));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-lab-50 text-lab-700 shadow-inner'
                      : 'text-zinc-600 hover:text-lab-700 hover:bg-lab-50/60',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/records/new" className="hidden sm:inline-flex btn-primary">
            <Plus className="w-4 h-4" />
            <span>新建记录</span>
          </NavLink>
          <div className="flex items-center gap-1 bg-lab-50 rounded-lg p-1 border border-lab-100">
            {roleOptions.map(opt => {
              const Icon = opt.icon;
              const active = currentRole === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    active ? 'bg-white text-lab-700 shadow-soft' : 'text-zinc-500 hover:text-lab-600',
                  )}
                  title={`切换为${opt.label}视角`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
