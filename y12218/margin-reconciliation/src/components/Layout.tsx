import { BarChart3, Upload, List, FileText, Home, AlertTriangle } from 'lucide-react';
import type { StoreState } from '../store/useStore';

interface LayoutProps {
  activeTab: StoreState['activeTab'];
  onTabChange: (tab: StoreState['activeTab']) => void;
  hasData: boolean;
  summary?: {
    mismatchCount: number;
    criticalCount: number;
  } | null;
  children: React.ReactNode;
}

export function Layout({ activeTab, onTabChange, hasData, summary, children }: LayoutProps) {
  const tabs = [
    { id: 'import' as const, label: '导入样例', icon: Upload },
    { id: 'dashboard' as const, label: '概览图表', icon: BarChart3 },
    { id: 'detail' as const, label: '明细核对', icon: List },
    { id: 'report' as const, label: '报表导出', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-10">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">期货保证金</h1>
              <p className="text-xs text-gray-500">日终核对系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = !hasData && tab.id !== 'import';

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : isDisabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.id === 'detail' && summary && summary.mismatchCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {summary.mismatchCount}
                  </span>
                )}
                {tab.id === 'dashboard' && summary && summary.criticalCount > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    {summary.criticalCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>交易日：2026-05-30</p>
            <p className="mt-1">版本：v1.0.0</p>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
