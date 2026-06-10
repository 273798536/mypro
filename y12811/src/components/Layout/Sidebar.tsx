import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FlaskConical, 
  ClipboardCheck, 
  FileBarChart,
  Microscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    path: '/',
    label: '热图总览',
    icon: LayoutDashboard,
  },
  {
    path: '/heatmap',
    label: '热图分析',
    icon: Microscope,
  },
  {
    path: '/culture-records',
    label: '培养记录',
    icon: FlaskConical,
  },
  {
    path: '/review-center',
    label: '复核中心',
    icon: ClipboardCheck,
  },
  {
    path: '/report',
    label: '综合报告',
    icon: FileBarChart,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-lab-950/80 backdrop-blur-xl border-r border-white/10 flex flex-col fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-400/20 flex items-center justify-center">
            <Microscope className="w-5 h-5 text-teal-400" />
          </div>
          <span className="font-semibold text-white text-lg">微生物分析</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20'
                  : 'text-lab-200 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center">
              <span className="text-teal-400 font-medium text-sm">技</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">张技师</p>
              <p className="text-xs text-lab-400 truncate">实验室技术员</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
