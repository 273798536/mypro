import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CircuitBoard,
  Zap,
  FileBarChart,
  History,
  Activity,
  Database,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/coils', icon: CircuitBoard, label: '线圈参数' },
  { path: '/magnetic', icon: Zap, label: '磁场序列' },
  { path: '/reports', icon: FileBarChart, label: '测算报告' },
  { path: '/replay', icon: Activity, label: '曲线回放' },
  { path: '/history', icon: History, label: '历史追溯' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-dark-card/50 backdrop-blur-xl border-r border-dark-border/50 flex flex-col">
      <div className="p-6 border-b border-dark-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-lg">电磁感应</h1>
            <p className="text-xs text-primary-300">线圈测算系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-border/30">
        <div className="text-xs text-primary-400">
          <p className="font-medium">系统状态</p>
          <p className="mt-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            运行正常
          </p>
        </div>
      </div>
    </aside>
  );
}
