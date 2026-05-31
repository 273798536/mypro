import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  GitMerge,
  AlertTriangle,
  FileText,
  Music,
} from 'lucide-react';
import { useStore } from '@/store';

const navItems = [
  { label: '仪表盘', icon: LayoutDashboard, path: '/' },
  { label: '物资清单', icon: Package, path: '/boxes' },
  { label: '城市场次', icon: MapPin, path: '/cities' },
  { label: '冲突中心', icon: GitMerge, path: '/conflicts', badgeKey: 'conflicts' as const },
  { label: '异常预警', icon: AlertTriangle, path: '/alerts', badgeKey: 'alerts' as const },
  { label: '物流报告', icon: FileText, path: '/reports' },
];

export function Layout() {
  const location = useLocation();
  const currentUser = useStore((s) => s.currentUser);
  const conflicts = useStore((s) => s.conflicts);
  const alerts = useStore((s) => s.alerts);

  const pendingConflicts = conflicts.filter((c) => c.status === 'pending').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;

  const badgeCounts: Record<string, number> = {
    conflicts: pendingConflicts,
    alerts: activeAlerts,
  };

  const roleLabels: Record<string, string> = {
    'tour-executive': '巡演总管',
    'material-admin': '物资管理员',
    'city-coordinator': '城市场次',
    'read-only': '只读用户',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-[240px] shrink-0 flex-col bg-primary-800 text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Music className="h-6 w-6 text-primary-200" />
          <h1 className="text-base font-semibold tracking-wide">乐团巡演物流清单</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 pt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-primary-800'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-800' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-danger px-1.5 text-xs font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-primary-700 px-5 py-4">
          <p className="text-sm font-medium text-white">{currentUser.name}</p>
          <p className="mt-0.5 text-xs text-primary-300">{roleLabels[currentUser.role] || currentUser.role}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-neutral-bg">
        <Outlet />
      </main>
    </div>
  );
}
