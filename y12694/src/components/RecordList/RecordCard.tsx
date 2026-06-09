import { AlertTriangle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import type { ConnectionRecord } from '@/types';
import { statusColor, statusLabel } from '@/utils/validation';
import { getRegionById } from '@/data/brainRegions';
import { formatTimestamp } from '@/utils/timestamp';

interface RecordCardProps {
  record: ConnectionRecord;
  isSelected: boolean;
  onClick: () => void;
}

export const RecordCard = ({ record, isSelected, onClick }: RecordCardProps) => {
  const from = getRegionById(record.fromRegion);
  const to = getRegionById(record.toRegion);

  const StatusIcon =
    record.status === 'normal'
      ? CheckCircle2
      : record.status === 'pending'
        ? AlertTriangle
        : XCircle;

  const borderColor = statusColor[record.status];

  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-lg border text-left transition-all duration-200 ${
        isSelected
          ? 'border-cyan-400/60 bg-[#0F172A]/80 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
          : 'border-slate-700/50 bg-[#0B1026]/60 hover:border-slate-600 hover:bg-[#111827]/70'
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{
          backgroundColor: borderColor,
          boxShadow: `0 0 12px ${borderColor}66`,
        }}
      />
      <div className="flex items-start gap-3 px-3.5 py-3 pl-4">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${borderColor}22` }}
        >
          <StatusIcon
            className="h-3.5 w-3.5"
            style={{ color: borderColor }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-[12px] font-bold text-slate-100"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {record.id}
            </span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${borderColor}22`,
                color: borderColor,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {statusLabel[record.status]}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">{from?.abbr ?? record.fromRegion}</span>
            <span className="text-slate-600">→</span>
            <span className="font-medium text-slate-300">{to?.abbr ?? record.toRegion}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className="rounded px-1.5 py-0.5 font-mono"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              强度 {(record.strength * 100).toFixed(0)}%
            </span>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-slate-500"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {record.coordinateSystem}
            </span>
            {record.outOfBounds && (
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[#F87171] bg-[#F87171]/10"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                越界
              </span>
            )}
            {record.riskNotes.length > 0 && (
              <span
                className="rounded px-1.5 py-0.5 font-mono text-amber-400 bg-amber-400/10"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                备注 {record.riskNotes.length}
              </span>
            )}
          </div>
          <div
            className="mt-1 text-[10px] text-slate-600"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatTimestamp(record.timestamp)}
          </div>
        </div>
        <ChevronRight
          className={`mt-1 h-4 w-4 shrink-0 transition-all ${
            isSelected
              ? 'text-cyan-400 translate-x-0'
              : 'text-slate-600 -translate-x-1 group-hover:translate-x-0 group-hover:text-slate-400'
          }`}
        />
      </div>
    </button>
  );
};
