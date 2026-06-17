import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { complaintEvents } from '@/data/mockData';
import { COMPLAINT_STATUS_LABELS } from '@/types';
import type { ComplaintStatus } from '@/types';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const statusConfig: Record<ComplaintStatus, { icon: typeof CheckCircle; color: string; bgColor: string; borderColor: string }> = {
  processed: { icon: CheckCircle, color: 'text-status-processed', bgColor: 'bg-status-processed/10', borderColor: 'border-status-processed/20' },
  pending: { icon: Clock, color: 'text-status-pending', bgColor: 'bg-status-pending/10', borderColor: 'border-status-pending/20' },
  evidence_needed: { icon: AlertTriangle, color: 'text-status-evidence', bgColor: 'bg-status-evidence/10', borderColor: 'border-status-evidence/20' },
};

export default function StatusPanel() {
  const filter = useAppStore((s) => s.filter);
  const timeRangeStart = useAppStore((s) => s.timeRangeStart);
  const timeRangeEnd = useAppStore((s) => s.timeRangeEnd);
  const selectedLocationId = useAppStore((s) => s.selectedLocationId);

  const filteredEvents = useMemo(() => {
    return complaintEvents.filter((evt) => {
      if (selectedLocationId && evt.locationId !== selectedLocationId) return false;
      if (filter.types.length > 0 && !filter.types.includes(evt.type)) return false;
      if (filter.statuses.length > 0 && !filter.statuses.includes(evt.status)) return false;
      if (evt.eventDate < timeRangeStart || evt.eventDate > timeRangeEnd) return false;
      return true;
    });
  }, [filter, timeRangeStart, timeRangeEnd, selectedLocationId]);

  const statusCounts = useMemo(() => ({
    processed: filteredEvents.filter((e) => e.status === 'processed').length,
    pending: filteredEvents.filter((e) => e.status === 'pending').length,
    evidence_needed: filteredEvents.filter((e) => e.status === 'evidence_needed').length,
  }), [filteredEvents]);

  const total = filteredEvents.length;

  const processedPct = total > 0 ? (statusCounts.processed / total) * 100 : 0;
  const pendingPct = total > 0 ? (statusCounts.pending / total) * 100 : 0;
  const evidencePct = total > 0 ? (statusCounts.evidence_needed / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-amber-400" />
        <span className="font-serif text-sm text-amber-400 font-semibold">处理状态</span>
        <span className="text-xs text-gray-500 ml-auto">共 {total} 条</span>
      </div>

      <div className="relative h-4 rounded-full overflow-hidden bg-navy-900/80">
        <div className="absolute inset-y-0 left-0 bg-status-processed/70 transition-all duration-500" style={{ width: `${processedPct}%` }} />
        <div className="absolute inset-y-0 bg-status-pending/70 transition-all duration-500" style={{ left: `${processedPct}%`, width: `${pendingPct}%` }} />
        <div className="absolute inset-y-0 bg-status-evidence/70 transition-all duration-500" style={{ left: `${processedPct + pendingPct}%`, width: `${evidencePct}%` }} />
      </div>

      <div className="space-y-2">
        {(Object.keys(statusConfig) as ComplaintStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = statusCounts[status];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={status} className={`flex items-center gap-3 p-2.5 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
              <Icon size={16} className={config.color} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {COMPLAINT_STATUS_LABELS[status]}
                  </span>
                  <span className={`text-lg font-bold ${config.color}`}>
                    {count}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-navy-900/60">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    status === 'processed' ? 'bg-status-processed' :
                    status === 'pending' ? 'bg-status-pending' :
                    'bg-status-evidence'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {statusCounts.evidence_needed > 0 && (
        <div className="p-2.5 rounded-lg border border-status-evidence/20 bg-status-evidence/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} className="text-status-evidence" />
            <span className="text-xs text-status-evidence font-medium">待补证据提醒</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            当前有 <span className="text-status-evidence font-bold">{statusCounts.evidence_needed}</span> 条投诉缺少关键证据，需补充现场照片或审批台账原文后方可结案。
          </p>
        </div>
      )}
    </div>
  );
}
