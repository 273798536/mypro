import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Waves,
  Droplets,
  Clock,
  FileCheck,
  User,
  Eye,
} from 'lucide-react';
import { useAppStore } from '../store';
import { USER_ROLE_LABELS } from '../types';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '结果总览', roles: ['safety_officer', 'marine_affairs'] },
  { path: '/visualization', icon: Globe, label: '3D轨迹可视化', roles: ['safety_officer', 'marine_affairs'] },
  { path: '/cleaning', icon: Waves, label: '轨迹清洗工作台', roles: ['safety_officer'] },
  { path: '/water-quality', icon: Droplets, label: '水质预警中心', roles: ['safety_officer', 'marine_affairs'] },
  { path: '/review', icon: FileCheck, label: '复核审批', roles: ['safety_officer', 'marine_affairs'] },
  { path: '/history', icon: Clock, label: '历史回溯', roles: ['safety_officer', 'marine_affairs'] },
];

export default function Sidebar() {
  const { currentUser, viewMode, toggleViewMode, statistics, anomalyRecords } = useAppStore();
  
  const unresolvedAnomalies = anomalyRecords.filter(a => !a.resolved).length;
  const pendingCount = statistics.review.pending + unresolvedAnomalies;

  return (
    <aside className="w-64 h-screen bg-ocean-900/95 border-r border-ocean-700/50 flex flex-col">
      <div className="p-6 border-b border-ocean-700/50">
        <h1 className="font-display text-xl font-bold text-ocean-100 tracking-wide">
          海洋碳汇样地账本
        </h1>
        <p className="text-xs text-ocean-400 mt-1">Ocean Carbon Sink Ledger</p>
      </div>

      <div className="p-4 border-b border-ocean-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ocean-700 flex items-center justify-center">
            <User className="w-5 h-5 text-ocean-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ocean-100 truncate">
              {currentUser.name}
            </p>
            <p className="text-xs text-ocean-400">
              {USER_ROLE_LABELS[currentUser.role]}
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleViewMode}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-ocean-800 hover:bg-ocean-700 rounded-lg text-xs text-ocean-200 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>
            切换至{viewMode === 'safety_officer' ? '海事处' : '安全员'}视角
          </span>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.includes(currentUser.role))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-ocean-600 text-white shadow-lg shadow-ocean-500/20'
                    : 'text-ocean-300 hover:bg-ocean-800/60 hover:text-ocean-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/review' && pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-data-recollect text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-ocean-700/50">
        <div className="bg-ocean-800/50 rounded-lg p-3">
          <p className="text-xs text-ocean-400 mb-2">数据质量概览</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-data-available">可用</span>
              <span className="text-ocean-200 font-mono">{statistics.track.available}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-data-suspended">暂缓</span>
              <span className="text-ocean-200 font-mono">{statistics.track.suspended}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-data-recollect">重采</span>
              <span className="text-ocean-200 font-mono">{statistics.track.recollect}</span>
            </div>
            <div className="h-1.5 bg-ocean-900 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-data-available via-data-suspended to-data-recollect"
                style={{
                  width: `${Math.min(100, (statistics.track.available / statistics.track.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
