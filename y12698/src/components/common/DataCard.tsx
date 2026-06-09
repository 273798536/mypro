import { FileText, AlertTriangle, Copy, CheckCircle2, Clock } from 'lucide-react';
import type { DataRecord } from '../../types';
import { formatCoordinate } from '../../utils/coordinateTransform';

interface Props {
  record: DataRecord;
  isSelected: boolean;
  onClick: () => void;
}

const statusMap = {
  pending: { label: '待复核', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: Clock },
  approved: { label: '已通过', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle2 },
  disputed: { label: '有异议', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: AlertTriangle },
};

const coordCls: Record<string, string> = {
  WGS84: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  UTM51N: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  LOCAL: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

export default function DataCard({ record, isSelected, onClick }: Props) {
  const s = statusMap[record.reviewStatus];
  const StatusIcon = s.icon;
  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-md border p-3 transition-all duration-200 ${
        isSelected
          ? 'border-[#00D4AA] bg-[#00D4AA]/10 shadow-[0_0_0_1px_#00D4AA,0_0_20px_rgba(0,212,170,0.15)]'
          : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
      }`}
    >
      {record.isDuplicate && (
        <div className="absolute -right-1 -top-1">
          <div className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <Copy size={10} /> 疑似重复
          </div>
        </div>
      )}
      {record.isOutOfBounds && (
        <div className="absolute -left-1 -top-1">
          <div className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            <AlertTriangle size={10} /> 越界
          </div>
        </div>
      )}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FileText size={12} className="text-slate-500" />
          <span className="font-mono text-[11px] text-slate-400">
            {record.sourceFile}
            <span className="text-[#00D4AA]">
              #L{record.sourceLine}
            </span>
          </span>
        </div>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${coordCls[record.coordinateSystem]}`}>
          {record.coordinateSystem}
        </span>
      </div>
      <p className="mb-2 font-mono text-[10px] leading-relaxed text-slate-500 line-clamp-1">
        {formatCoordinate(record.coordinateSystem, record.x, record.y, record.z_m)}
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <div className="rounded bg-slate-800/60 px-2 py-1">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">温度</div>
          <div className={`font-mono text-sm ${record.outOfBoundsFields?.includes('temperature') ? 'text-rose-400' : 'text-[#FF6B35]'}`}>
            {record.temperature.toFixed(0)}℃
          </div>
        </div>
        <div className="rounded bg-slate-800/60 px-2 py-1">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">流速</div>
          <div className={`font-mono text-sm ${record.outOfBoundsFields?.includes('flowRate') ? 'text-rose-400' : 'text-[#00D4AA]'}`}>
            {record.flowRate.toFixed(2)} m/s
          </div>
        </div>
      </div>
      <p className="mb-2 line-clamp-2 text-xs text-slate-400">{record.conclusion.replace(/\{\{time:[^}]+\}\}/g, '⏱')}</p>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${s.cls}`}>
          <StatusIcon size={10} />
          <span className="text-[10px] font-medium">{s.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-slate-700/60 px-1.5 py-0.5 font-mono text-[10px] text-[#FFD93D]">
            {record.version}
          </span>
          <span className="font-mono text-[9px] text-slate-500">
            {record.timeParam.slice(5, 16)}
          </span>
        </div>
      </div>
      {record.sourceNote && (
        <div className="mt-2 border-t border-slate-700/50 pt-2">
          <p className="text-[10px] italic text-slate-500">📎 {record.sourceNote}</p>
        </div>
      )}
    </div>
  );
}
