import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { locations, complaintEvents } from '@/data/mockData';
import { COMPLAINT_TYPE_LABELS, COMPLAINT_STATUS_LABELS, SOURCE_TYPE_LABELS } from '@/types';
import type { ComplaintType, ComplaintStatus, SourceType } from '@/types';
import { Filter, X, MapPin } from 'lucide-react';

const allTypes: ComplaintType[] = ['noise', 'occupation', 'hygiene', 'schedule'];
const allStatuses: ComplaintStatus[] = ['processed', 'pending', 'evidence_needed'];
const allSourceTypes: SourceType[] = ['original', 'supplement', 'screenshot'];

export default function FilterPanel() {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const selectedLocationId = useAppStore((s) => s.selectedLocationId);
  const setSelectedLocationId = useAppStore((s) => s.setSelectedLocationId);
  const timeRangeStart = useAppStore((s) => s.timeRangeStart);
  const timeRangeEnd = useAppStore((s) => s.timeRangeEnd);

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

  const toggleType = (t: ComplaintType) => {
    const current = filter.types;
    setFilter({
      types: current.includes(t) ? current.filter((x) => x !== t) : [...current, t],
    });
  };

  const toggleStatus = (s: ComplaintStatus) => {
    const current = filter.statuses;
    setFilter({
      statuses: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
    });
  };

  const toggleSourceType = (st: SourceType) => {
    const current = filter.sourceTypes;
    setFilter({
      sourceTypes: current.includes(st) ? current.filter((x) => x !== st) : [...current, st],
    });
  };

  const clearFilters = () => {
    setFilter({ types: [], statuses: [], sourceTypes: [], locationId: null, searchAlias: '' });
    setSelectedLocationId(null);
  };

  const hasActiveFilters = filter.types.length > 0 || filter.statuses.length > 0 || filter.sourceTypes.length > 0 || selectedLocationId;

  const statusColors: Record<ComplaintStatus, string> = {
    processed: 'bg-status-processed',
    pending: 'bg-status-pending',
    evidence_needed: 'bg-status-evidence',
  };

  const statusBorderColors: Record<ComplaintStatus, string> = {
    processed: 'border-status-processed/40',
    pending: 'border-status-pending/40',
    evidence_needed: 'border-status-evidence/40',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-amber-400" />
          <span className="font-serif text-sm text-amber-400 font-semibold">筛选</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-400 transition-colors">
            <X size={12} />
            清除
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {allStatuses.map((s) => {
          const isActive = filter.statuses.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`relative p-2 rounded-lg border text-center transition-all ${
                isActive
                  ? `${statusBorderColors[s]} bg-navy-700/60`
                  : 'border-gray-700/40 bg-navy-900/30 hover:border-gray-600'
              }`}
            >
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${
                isActive ? `${statusColors[s]} text-navy-900` : 'bg-gray-700/50 text-gray-400'
              }`}>
                {s === 'processed' ? statusCounts.processed : s === 'pending' ? statusCounts.pending : statusCounts.evidence_needed}
              </div>
              <div className={`text-xs mt-1 ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>
                {COMPLAINT_STATUS_LABELS[s]}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">投诉类型</div>
        <div className="flex flex-wrap gap-1.5">
          {allTypes.map((t) => {
            const isActive = filter.types.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'border-amber-400/50 bg-amber-400/15 text-amber-400'
                    : 'border-gray-700/40 bg-navy-900/30 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {COMPLAINT_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">来源类型</div>
        <div className="flex flex-wrap gap-1.5">
          {allSourceTypes.map((st) => {
            const isActive = filter.sourceTypes.includes(st);
            return (
              <button
                key={st}
                onClick={() => toggleSourceType(st)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'border-blue-400/50 bg-blue-400/15 text-blue-400'
                    : 'border-gray-700/40 bg-navy-900/30 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {SOURCE_TYPE_LABELS[st]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">地点</div>
        <div className="space-y-1">
          {locations.map((loc) => {
            const isActive = selectedLocationId === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocationId(isActive ? null : loc.id)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all ${
                  isActive
                    ? 'border-amber-400/40 bg-amber-400/10'
                    : 'border-gray-700/30 bg-navy-900/20 hover:border-gray-600/50'
                }`}
              >
                <MapPin size={12} className={isActive ? 'text-amber-400' : 'text-gray-500'} />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${isActive ? 'text-amber-400' : 'text-gray-300'}`}>
                    {loc.canonicalName}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {loc.aliases.filter(a => a !== loc.canonicalName).join('、')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700/30">
        <div className="text-xs text-gray-500">
          匹配 <span className="text-amber-400 font-bold">{filteredEvents.length}</span> 条投诉事件
        </div>
      </div>
    </div>
  );
}
