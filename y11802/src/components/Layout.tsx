import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardCheck, History, RotateCcw, Download } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { resetToSampleData, exportToCSV, redemptions } = useRedemptionStore();
  const pendingReviewCount = redemptions.filter(r => r.needsReview).length;

  const navItems = [
    { path: '/', label: '排队看板', icon: LayoutDashboard },
    { path: '/review', label: '复核工作台', icon: ClipboardCheck, badge: pendingReviewCount },
    { path: '/history', label: '历史记录', icon: History },
  ];

  return (
    <div className="flex h-screen bg-slate-850">
      <aside className="w-60 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">赎回排队看板</h1>
              <p className="text-xs text-slate-400">基金运营工作台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700 space-y-2">
          <button
            onClick={() => exportToCSV()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
          <button
            onClick={() => {
              if (confirm('确定要重置为样例数据吗？所有修改将丢失。')) {
                resetToSampleData();
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-amber-400 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置样例数据
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
