import { CheckCircle2, AlertTriangle, AlertOctagon, Layers } from 'lucide-react';
import { useConflictStore } from '@/store/conflictStore';
import { STATUS_LABEL } from '@/types';
import type { ConflictStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TabOption {
  value: 'all' | ConflictStatus;
  label: string;
  icon: React.ReactNode;
  badgeColor: string;
  badgeBg: string;
  countKey: 'total' | 'resolved' | 'pendingEvidence' | 'pendingConfirm';
}

const tabs: TabOption[] = [
  {
    value: 'all',
    label: '全部',
    icon: <Layers className="w-4 h-4" />,
    badgeColor: 'text-brand-700',
    badgeBg: 'bg-brand-100',
    countKey: 'total',
  },
  {
    value: 'resolved',
    label: STATUS_LABEL.resolved,
    icon: <CheckCircle2 className="w-4 h-4" />,
    badgeColor: 'text-status-resolved',
    badgeBg: 'bg-status-resolvedBg',
    countKey: 'resolved',
  },
  {
    value: 'pending_evidence',
    label: STATUS_LABEL.pending_evidence,
    icon: <AlertTriangle className="w-4 h-4" />,
    badgeColor: 'text-status-evidence',
    badgeBg: 'bg-status-evidenceBg',
    countKey: 'pendingEvidence',
  },
  {
    value: 'pending_confirm',
    label: STATUS_LABEL.pending_confirm,
    icon: <AlertOctagon className="w-4 h-4" />,
    badgeColor: 'text-status-confirm',
    badgeBg: 'bg-status-confirmBg',
    countKey: 'pendingConfirm',
  },
];

export default function StatusTabs() {
  const { activeStatusTab, setActiveStatusTab, getStatistics } = useConflictStore();
  const stats = getStatistics();

  return (
    <div className="border-b border-gray-200 bg-white/60 backdrop-blur-sm rounded-t-xl px-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const count = stats[tab.countKey];
          const isActive = activeStatusTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-4 text-sm whitespace-nowrap transition-all duration-200',
                isActive ? 'tab-active -translate-y-0.5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/80'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  tab.badgeBg,
                  tab.badgeColor,
                  'border-transparent'
                )}
              >
                {tab.icon}
                <span className="tabular-nums">{count}</span>
              </span>
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
