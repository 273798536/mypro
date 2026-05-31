import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileUp, 
  ClipboardCheck, 
  GitCompare, 
  AlertTriangle, 
  Edit3, 
  History,
  Music
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/check', label: '排班检查', icon: ClipboardCheck },
  { path: '/compare', label: '变化对比', icon: GitCompare },
  { path: '/boundary', label: '边界样例', icon: AlertTriangle },
  { path: '/correction', label: '手动修正', icon: Edit3 },
  { path: '/history', label: '调度历史', icon: History },
];

export function Sidebar() {
  const location = useLocation();
  const { currentPhase, snapshots } = useScheduleStore();
  
  const getPhaseLabel = () => {
    const hasPhase2 = snapshots.some(s => s.phase === 'phase2');
    const hasPhase1 = snapshots.some(s => s.phase === 'phase1');
    
    if (hasPhase2) return '第二阶段 · 培训记录已补录';
    if (hasPhase1) return '第一阶段 · 等待培训记录';
    return '未开始 · 请先导入数据';
  };
  
  return (
    <aside className="w-64 bg-navy-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-wine-600 rounded flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white">
              音乐会排班
            </h1>
            <p className="text-xs text-navy-400">志愿者管理系统</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-navy-700">
        <div className="bg-navy-800 rounded p-3">
          <p className="text-xs text-navy-400 mb-1">当前阶段</p>
          <p className="text-sm font-medium text-white">
            {getPhaseLabel()}
          </p>
        </div>
      </div>
    </aside>
  );
}
