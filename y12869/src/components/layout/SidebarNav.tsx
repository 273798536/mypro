import { NavLink } from 'react-router-dom';
import { Box, Waves, Layers, AlertTriangle, FileBarChart, ScanSearch, Anchor } from 'lucide-react';
import { useTideWatcher } from '@/hooks/useTideWatcher';
import { useAnomalyDisposal } from '@/hooks/useAnomalyDisposal';

const navItems = [
  { path: '/visualization', icon: Box, label: '3D 可视化' },
  { path: '/trajectory', icon: ScanSearch, label: '轨迹清洗' },
  { path: '/tide', icon: Waves, label: '潮汐追踪' },
  { path: '/anomaly', icon: AlertTriangle, label: '异常工作台' },
  { path: '/report', icon: FileBarChart, label: '报告导出' },
];

export function SidebarNav() {
  const { stats } = useAnomalyDisposal();
  const { currentVersion } = useTideWatcher();

  return (
    <aside className="w-16 bg-channel-panel border-r border-channel-border flex flex-col items-center py-4 gap-1 flex-shrink-0">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center mb-3 shadow-glow-blue">
        <Anchor className="w-5 h-5 text-white" />
      </div>
      <div className="w-10 h-px bg-channel-border mb-2" />
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative group
            ${isActive
              ? 'bg-ocean-700/40 text-ocean-300 border border-ocean-600/50'
              : 'text-channel-muted hover:bg-channel-card hover:text-channel-text'
            }
          `}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[9px] leading-none">{item.label.split(' ')[0]}</span>
          {item.path === '/anomaly' && stats.bySeverity.red > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          {item.path === '/tide' && currentVersion?.status === 'delayed' && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </NavLink>
      ))}
      <div className="flex-1" />
      <div className="w-10 h-10 rounded-full bg-channel-card border border-channel-border flex items-center justify-center">
        <Layers className="w-4 h-4 text-channel-muted" />
      </div>
      <div className="text-[10px] text-channel-muted mt-1 text-center leading-tight">
        v1.0.3
      </div>
    </aside>
  );
}
