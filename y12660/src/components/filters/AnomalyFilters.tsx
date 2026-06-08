import { useRecordsStore } from '@/store/records';
import type { AnomalyType, AvailabilityStatus } from '@/types';
import { ANOMALY_LABELS, STATUS_LABELS } from '@/types';
import { RotateCcw, Filter, AlertOctagon } from 'lucide-react';

const anomalyColors: Record<AnomalyType, string> = {
  empty_coordinate: 'border-anomaly-error/40 text-anomaly-error',
  duplicate_record: 'border-anomaly-error/40 text-anomaly-error',
  remark_mixed: 'border-anomaly-warn/40 text-anomaly-warn',
  camera_view_lost: 'border-anomaly-error/40 text-anomaly-error',
};

const anomalySelectedColors: Record<AnomalyType, string> = {
  empty_coordinate: 'bg-anomaly-error/20 border-anomaly-error/60 text-anomaly-error',
  duplicate_record: 'bg-anomaly-error/20 border-anomaly-error/60 text-anomaly-error',
  remark_mixed: 'bg-anomaly-warn/20 border-anomaly-warn/60 text-anomaly-warn',
  camera_view_lost: 'bg-anomaly-error/20 border-anomaly-error/60 text-anomaly-error',
};

const statusColors: Record<AvailabilityStatus, string> = {
  usable: 'border-status-usable/40 text-status-usable',
  review_needed: 'border-status-review/50 text-hall-textDim',
  unusable: 'border-status-unusable/40 text-status-unusable',
};

const statusSelectedColors: Record<AvailabilityStatus, string> = {
  usable: 'bg-status-usable/20 border-status-usable/60 text-status-usable',
  review_needed: 'bg-status-review/30 border-status-review/70 text-hall-text',
  unusable: 'bg-status-unusable/20 border-status-unusable/60 text-status-unusable',
};

export function AnomalyFilters() {
  const batches = useRecordsStore((s) => s.batches);
  const records = useRecordsStore((s) => s.records);
  const filters = useRecordsStore((s) => s.filters);
  const toggleAnomaly = useRecordsStore((s) => s.toggleAnomalyFilter);
  const toggleStatus = useRecordsStore((s) => s.toggleStatusFilter);
  const toggleBatch = useRecordsStore((s) => s.toggleBatchFilter);
  const setOnlyAnom = useRecordsStore((s) => s.setOnlyWithAnomalies);
  const setKw = useRecordsStore((s) => s.setKeyword);
  const reset = useRecordsStore((s) => s.resetFilters);

  const anomalyTypes: AnomalyType[] = ['empty_coordinate', 'duplicate_record', 'remark_mixed', 'camera_view_lost'];
  const statuses: AvailabilityStatus[] = ['usable', 'review_needed', 'unusable'];

  const anomalyCount = (t: AnomalyType) => records.filter((r) => r.anomalies.some((a) => a.type === t)).length;
  const statusCount = (st: AvailabilityStatus) => records.filter((r) => r.availabilityStatus === st).length;

  return (
    <aside className="w-64 shrink-0 border-r border-hall-border bg-hall-bg2/60 h-full overflow-y-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold font-display text-hall-text">
          <Filter size={14} /> 筛选
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1 text-[11px] text-hall-textMute hover:text-hall-text transition">
          <RotateCcw size={11} /> 重置
        </button>
      </div>

      <div>
        <input
          value={filters.keyword}
          onChange={(e) => setKw(e.target.value)}
          placeholder="搜索设备编号 / 备注 / ID"
          className="input"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs text-hall-textDim mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.onlyWithAnomalies}
            onChange={(e) => setOnlyAnom(e.target.checked)}
            className="accent-hall-accent"
          />
          <AlertOctagon size={12} />
          只看异常记录
        </label>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-hall-textMute/80 mb-2">异常类型</div>
        <div className="flex flex-wrap gap-1.5">
          {anomalyTypes.map((t) => {
            const active = filters.anomalyTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleAnomaly(t)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  active ? anomalySelectedColors[t] : anomalyColors[t] + ' bg-transparent hover:bg-white/5'
                }`}
              >
                {ANOMALY_LABELS[t]}
                <span className="opacity-60">{anomalyCount(t)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-hall-textMute/80 mb-2">可用状态</div>
        <div className="flex flex-col gap-1.5">
          {statuses.map((st) => {
            const active = filters.statuses.includes(st);
            return (
              <button
                key={st}
                onClick={() => toggleStatus(st)}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs border transition-colors ${
                  active ? statusSelectedColors[st] : statusColors[st] + ' bg-transparent hover:bg-white/5'
                }`}
              >
                <span>{STATUS_LABELS[st]}</span>
                <span className="opacity-60">{statusCount(st)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-hall-textMute/80 mb-2">导入批次</div>
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
          {batches.map((b) => {
            const active = filters.batchIds.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBatch(b.id)}
                className={`text-left px-2 py-1 rounded text-xs border transition-colors truncate ${
                  active
                    ? 'bg-hall-accent/15 border-hall-accent/40 text-hall-accent'
                    : 'border-hall-border text-hall-textDim hover:text-hall-text hover:bg-hall-bg3'
                }`}
                title={b.name}
              >
                <div className="truncate font-medium">{b.name}</div>
                <div className="text-[10px] opacity-70">{b.importedBy} · {b.recordCount} 条</div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
