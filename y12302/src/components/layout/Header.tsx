import { 
  Box, 
  Database, 
  AlertTriangle, 
  Download, 
  FileSearch,
  Camera,
  Bell
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import type { ActiveTab } from '../../types';

const tabs: { id: ActiveTab; label: string; icon: typeof Box }[] = [
  { id: 'workspace', label: '3D工作台', icon: Box },
  { id: 'data', label: '数据管理', icon: Database },
  { id: 'detection', label: '问题检测', icon: AlertTriangle },
  { id: 'export', label: '报告导出', icon: Download },
  { id: 'review', label: '详情复核', icon: FileSearch },
];

export function Header() {
  const { activeTab, setActiveTab, issues } = useAppStore();
  const unresolvedIssues = issues.filter((i) => !i.resolved).length;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4">
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
          <Box size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm">医学剂量云图工作台</h1>
          <p className="text-xs text-slate-500">Dose Cloud Workstation</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
              activeTab === tab.id
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'detection' && unresolvedIssues > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full">
                {unresolvedIssues}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Camera size={16} />
          截图
        </button>
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Bell size={18} />
          {unresolvedIssues > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}
