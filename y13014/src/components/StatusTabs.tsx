import type { StatusTab } from '@/types';
import { STATUS_TAB_LABEL } from '@/types';
import { useWarningStore } from '@/store/useWarningStore';

const tabStyles: Record<StatusTab, string> = {
  all: 'ring-deep-sea-700/30',
  confirmed: 'ring-emerald-600/30',
  pending: 'ring-amber-600/30',
  returned: 'ring-slate-500/30',
};

export default function StatusTabs() {
  const activeTab = useWarningStore((s) => s.activeStatusTab);
  const setActiveTab = useWarningStore((s) => s.setActiveStatusTab);
  const counts = useWarningStore((s) => s.getStatusCounts());

  const tabs: StatusTab[] = ['all', 'pending', 'confirmed', 'returned'];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition',
              active
                ? `bg-deep-sea-700 text-white shadow-md ring-2 ${tabStyles[tab]}`
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            <span>{STATUS_TAB_LABEL[tab]}</span>
            <span
              className={[
                'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold',
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
