import { useState } from 'react';
import { FileText, AlertTriangle, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import RiskNoteList from '@/components/records/RiskNoteList';
import ConclusionList from '@/components/records/ConclusionList';

type TabType = 'all' | 'notes' | 'conclusions';

const tabs: { key: TabType; label: string; Icon: typeof List }[] = [
  { key: 'all', label: '全部显示', Icon: List },
  { key: 'notes', label: '只显示风险备注', Icon: AlertTriangle },
  { key: 'conclusions', label: '只显示结论', Icon: FileText },
];

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const showNotes = activeTab === 'all' || activeTab === 'notes';
  const showConclusions = activeTab === 'all' || activeTab === 'conclusions';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm shrink-0">
        <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <FileText size={16} className="text-cyan-400" />
          巡检记录管理
        </h1>

        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === key
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {showNotes && (
          <div className={cn('flex-1 min-w-0', showConclusions ? '' : 'w-full')}>
            <RiskNoteList showMisread />
          </div>
        )}
        {showConclusions && (
          <div className={cn('flex-1 min-w-0', showNotes ? '' : 'w-full')}>
            <ConclusionList />
          </div>
        )}
      </div>
    </div>
  );
}
