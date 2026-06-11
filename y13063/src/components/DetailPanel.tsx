import { useAppStore } from '@/store/useAppStore';
import { Info, MessageSquare, Table2 } from 'lucide-react';
import PointDetail from '@/components/PointDetail';
import NoteList from '@/components/NoteList';
import CsvTable from '@/components/CsvTable';

export default function DetailPanel() {
  const tab = useAppStore((s) => s.activeDetailTab);
  const setTab = useAppStore((s) => s.setActiveDetailTab);

  const tabs = [
    { key: 'detail', label: '详情', Icon: Info },
    { key: 'notes', label: '备注', Icon: MessageSquare },
    { key: 'csv', label: 'CSV 明细', Icon: Table2 },
  ] as const;

  return (
    <aside className="w-[380px] shrink-0 border-l border-brand-100 bg-white flex flex-col">
      <div className="h-11 border-b border-brand-100 flex">
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm border-b-2 transition-colors ${
                active
                  ? 'border-brand-600 text-brand-700 font-medium bg-brand-50/40'
                  : 'border-transparent text-brand-500 hover:text-brand-700 hover:bg-brand-50/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'detail' && <PointDetail />}
        {tab === 'notes' && <NoteList />}
        {tab === 'csv' && <CsvTable />}
      </div>
    </aside>
  );
}
