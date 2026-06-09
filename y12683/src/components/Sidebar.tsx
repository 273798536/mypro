import { NavLink } from 'react-router-dom';
import {
  Radar,
  Layers,
  Calculator,
  GitBranch,
  Database,
  Anchor,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '碰撞检测', icon: Radar, end: true },
  { path: '/slices', label: '点云切片', icon: Layers },
  { path: '/calculator', label: '计算工具', icon: Calculator },
  { path: '/parameters', label: '参数联动', icon: GitBranch },
  { path: '/data-management', label: '数据管理', icon: Database },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-tech-gray-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col sticky top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-deep-sea-400 to-deep-sea-600 flex items-center justify-center shadow-lg shadow-deep-sea-500/30">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">压载水监控</h1>
            <p className="text-tech-gray-400 text-xs">Ballast Water 3D</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="glass-card p-4">
          <p className="text-xs text-tech-gray-400 mb-1">系统状态</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-green-500 animate-pulse-slow"></span>
            <span className="text-sm text-white">运行正常</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
