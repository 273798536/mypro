import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { complaintEvents } from '@/data/mockData';
import { COMPLAINT_TYPE_LABELS, COMPLAINT_STATUS_LABELS, SOURCE_TYPE_LABELS } from '@/types';
import type { ComplaintType, ComplaintStatus } from '@/types';
import { FileText, Camera, PenLine, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function YearSlider() {
  const timeRangeStart = useAppStore((s) => s.timeRangeStart);
  const timeRangeEnd = useAppStore((s) => s.timeRangeEnd);
  const setTimeRange = useAppStore((s) => s.setTimeRange);

  const startMonth = parseInt(timeRangeStart.split('-')[1]);
  const endMonth = parseInt(timeRangeEnd.split('-')[1]);

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        className="text-gray-400 hover:text-amber-400 transition-colors"
        onClick={() => setTimeRange('2024-01-01', '2024-12-31')}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex-1 flex gap-0.5">
        {MONTHS.map((m, i) => {
          const month = i + 1;
          const isActive = month >= startMonth && month <= endMonth;
          const hasEvent = complaintEvents.some((e) => {
            const d = parseInt(e.eventDate.split('-')[1]);
            return d === month;
          });
          return (
            <button
              key={m}
              className={`flex-1 h-8 text-xs rounded transition-all ${
                isActive
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                  : 'bg-navy-700/50 text-gray-500 border border-transparent hover:border-gray-600'
              } ${hasEvent ? 'font-bold' : ''}`}
              onClick={() => setTimeRange(`2025-${String(month).padStart(2,'0')}-01`, `2025-${String(month).padStart(2,'0')}-28`)}
            >
              {m}
            </button>
          );
        })}
      </div>
      <button
        className="text-gray-400 hover:text-amber-400 transition-colors"
        onClick={() => setTimeRange('2026-01-01', '2026-12-31')}
      >
        <ChevronRight size={16} />
      </button>
      <button
        className="text-xs text-gray-400 hover:text-amber-400 ml-2 px-2 py-1 rounded border border-gray-600 hover:border-amber-400/40 transition-colors"
        onClick={() => setTimeRange('2025-01-01', '2025-12-31')}
      >
        全年
      </button>
    </div>
  );
}

function SourceIcon({ sourceType }: { sourceType: string }) {
  switch (sourceType) {
    case 'original':
      return <FileText size={14} className="text-blue-400" />;
    case 'supplement':
      return <PenLine size={14} className="text-amber-400" />;
    case 'screenshot':
      return <Camera size={14} className="text-purple-400" />;
    default:
      return <FileText size={14} className="text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const colors: Record<ComplaintStatus, string> = {
    processed: 'bg-status-processed/20 text-status-processed border-status-processed/30',
    pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
    evidence_needed: 'bg-status-evidence/20 text-status-evidence border-status-evidence/30',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[status]}`}>
      {COMPLAINT_STATUS_LABELS[status]}
    </span>
  );
}

function useFilteredEvents() {
  const filter = useAppStore((s) => s.filter);
  const timeRangeStart = useAppStore((s) => s.timeRangeStart);
  const timeRangeEnd = useAppStore((s) => s.timeRangeEnd);
  const selectedLocationId = useAppStore((s) => s.selectedLocationId);

  return useMemo(() => {
    return complaintEvents.filter((evt) => {
      if (selectedLocationId && evt.locationId !== selectedLocationId) return false;
      if (filter.types.length > 0 && !filter.types.includes(evt.type)) return false;
      if (filter.statuses.length > 0 && !filter.statuses.includes(evt.status)) return false;
      if (evt.eventDate < timeRangeStart || evt.eventDate > timeRangeEnd) return false;
      return true;
    });
  }, [filter, timeRangeStart, timeRangeEnd, selectedLocationId]);
}

export default function EventTimeline() {
  const filteredEvents = useFilteredEvents();
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const setSelectedEventId = useAppStore((s) => s.setSelectedEventId);
  const getApprovalsForEvent = useAppStore((s) => s.getApprovalsForEvent);
  const getPhotosForEvent = useAppStore((s) => s.getPhotosForEvent);
  const getLocationById = useAppStore((s) => s.getLocationById);
  const selectedLocationId = useAppStore((s) => s.selectedLocationId);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [filteredEvents]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h3 className="font-serif text-amber-400 text-sm font-semibold mb-2">事件时间线</h3>
        <YearSlider />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {sortedEvents.length === 0 && (
          <div className="text-gray-500 text-xs text-center py-8">暂无匹配事件</div>
        )}

        {sortedEvents.map((evt, idx) => {
          const loc = getLocationById(evt.locationId);
          const approvals = getApprovalsForEvent(evt.id);
          const photos = getPhotosForEvent(evt.id);
          const isSelected = selectedEventId === evt.id;

          return (
            <button
              key={evt.id}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                isSelected
                  ? 'bg-amber-400/10 border border-amber-400/30'
                  : 'bg-navy-700/30 border border-transparent hover:bg-navy-700/60 hover:border-gray-600/50'
              }`}
              onClick={() => setSelectedEventId(isSelected ? null : evt.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    evt.status === 'processed' ? 'bg-status-processed' :
                    evt.status === 'pending' ? 'bg-status-pending' :
                    'bg-status-evidence'
                  }`} />
                  {idx < sortedEvents.length - 1 && (
                    <div className="w-px h-full bg-gray-700/50 mt-1" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{evt.eventDate}</span>
                    <StatusBadge status={evt.status} />
                    <span className="text-xs text-blue-400/80 bg-blue-400/10 px-1.5 py-0.5 rounded">
                      {COMPLAINT_TYPE_LABELS[evt.type]}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 mb-1">
                    {evt.description}
                  </p>

                  {loc && (
                    <p className="text-xs text-amber-400/70">
                      {loc.canonicalName}
                      {loc.aliases.length > 1 && (
                        <span className="text-gray-500 ml-1">
                          ({loc.aliases.slice(1, 3).join('、')}{loc.aliases.length > 3 ? '...' : ''})
                        </span>
                      )}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    {approvals.map((ar) => (
                      <span key={ar.id} className="flex items-center gap-1" title={SOURCE_TYPE_LABELS[ar.sourceType]}>
                        <SourceIcon sourceType={ar.sourceType} />
                        <span className="text-xs text-gray-500">{ar.version}</span>
                      </span>
                    ))}
                    {photos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Camera size={12} className="text-emerald-400" />
                        <span className="text-xs text-emerald-400">{photos.length}张照片</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedLocationId && (
        <div className="px-4 py-2 border-t border-gray-700/50 bg-navy-900/50">
          <button
            className="text-xs text-gray-400 hover:text-amber-400 transition-colors"
            onClick={() => useAppStore.getState().setSelectedLocationId(null)}
          >
            ← 查看全部地点
          </button>
        </div>
      )}
    </div>
  );
}
