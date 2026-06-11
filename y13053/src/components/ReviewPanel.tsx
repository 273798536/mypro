import type { ReviewRecord } from '@/types';
import { ReviewCard } from './ReviewCard';
import { ClipboardList } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  records: ReviewRecord[];
}

export function ReviewPanel({ records }: Props) {
  const { filters } = useAppStore();
  const counts = {
    all: records.length,
    anomaly: records.filter((r) => r.status === 'anomaly').length,
    normal: records.filter((r) => r.status !== 'anomaly').length,
  };
  const shown = filters.statusFilter === 'all'
    ? records
    : filters.statusFilter === 'anomaly'
      ? records.filter((r) => r.status === 'anomaly')
      : records.filter((r) => r.status !== 'anomaly');

  return (
    <div className="flex flex-col h-full bg-ocean-50/60 rounded border border-ocean-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ocean-100 bg-white">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-ocean-500" />
          <h2 className="font-serif font-semibold text-ocean-700 text-sm">评审批注</h2>
        </div>
        <div className="text-[11px] font-mono text-ocean-400">
          {filters.statusFilter === 'all' ? `共 ${counts.all} 条` : filters.statusFilter === 'anomaly' ? `异常 ${counts.anomaly}/${counts.all}` : `正常 ${counts.normal}/${counts.all}`}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {shown.map((r, i) => (
          <ReviewCard key={r.id} record={r} index={i} />
        ))}
        {shown.length === 0 && (
          <div className="text-center text-xs text-ocean-400 py-12">当前筛选下无评审批注</div>
        )}
      </div>
    </div>
  );
}
