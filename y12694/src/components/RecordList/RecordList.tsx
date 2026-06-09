import { useMemo, useState } from 'react';
import { List, CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { RecordStatus } from '@/types';
import { statusLabel } from '@/utils/validation';
import { RecordCard } from './RecordCard';

type FilterKey = 'all' | RecordStatus;

const filters: { key: FilterKey; label: string; Icon: any }[] = [
  { key: 'all', label: '全部', Icon: List },
  { key: 'normal', label: '顺利', Icon: CheckCircle2 },
  { key: 'pending', label: '待确认', Icon: AlertTriangle },
  { key: 'invalid', label: '坏数据', Icon: XCircle },
];

export const RecordList = () => {
  const { records, selectedRecordId, selectRecord } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const counts = useMemo(() => {
    return {
      all: records.length,
      normal: records.filter((r) => r.status === 'normal').length,
      pending: records.filter((r) => r.status === 'pending').length,
      invalid: records.filter((r) => r.status === 'invalid').length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const base =
      activeFilter === 'all'
        ? records
        : records.filter((r) => r.status === activeFilter);
    return [...base].sort((a, b) => {
      const order = { invalid: 0, pending: 1, normal: 2 } as const;
      return order[a.status] - order[b.status];
    });
  }, [records, activeFilter]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-[#0B1026]/70 backdrop-blur-sm">
      <div className="border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-cyan-400" />
            <h2
              className="text-sm font-bold text-slate-100"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              测量记录
            </h2>
            <span
              className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {records.length}
            </span>
          </div>
          <Filter className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <div className="mt-3 flex gap-1.5">
          {filters.map(({ key, label, Icon }) => {
            const active = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
                <span className="text-[10px] opacity-70">{counts[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            当前筛选下无记录
          </div>
        ) : (
          filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              isSelected={record.id === selectedRecordId}
              onClick={() => selectRecord(record.id === selectedRecordId ? null : record.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
