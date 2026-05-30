import {
  LayoutDashboard,
  Users,
  Trophy,
  AlertTriangle,
  FileBarChart,
  History,
  FileText,
  Scale,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const navItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'data', label: '数据管理', icon: Users },
  { id: 'ranking', label: '排名中心', icon: Trophy },
  { id: 'tiebreak', label: '同分确认', icon: Scale },
  { id: 'appeal', label: '申诉中心', icon: AlertTriangle },
  { id: 'history', label: '版本历史', icon: History },
  { id: 'report', label: '报告导出', icon: FileBarChart },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, pendingTieBreaks, appeals } = useAppStore();

  const pendingTieCount = pendingTieBreaks.filter((g) => g.status === 'pending').length;
  const pendingAppealCount = appeals.filter((a) => a.status === 'pending').length;

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <span>竞赛排名系统</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">TieBreak Manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const hasBadge =
            (item.id === 'tiebreak' && pendingTieCount > 0) ||
            (item.id === 'appeal' && pendingAppealCount > 0);
          const badgeCount = item.id === 'tiebreak' ? pendingTieCount : pendingAppealCount;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {hasBadge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px text-center">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          <p>裁判长模式</p>
          <p className="text-xs mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
