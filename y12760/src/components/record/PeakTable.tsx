import { AlertTriangle, AlertCircle, FileWarning, BarChart3 } from 'lucide-react';
import type { Peak, DataQuality } from '@/types';
import { formatNumber, formatNumberInt, dataQualityLabel } from '@/utils/format';
import { cn } from '@/lib/utils';

interface PeakTableProps {
  peaks: Peak[];
  editable?: boolean;
  onPeakChange?: (index: number, patch: Partial<Peak>) => void;
}

const qIcon: Record<DataQuality, typeof AlertTriangle | null> = {
  normal: null,
  null: AlertCircle,
  duplicate: AlertTriangle,
  note_inline: FileWarning,
  outlier: AlertTriangle,
};

const qClass: Record<DataQuality, string> = {
  normal: '',
  null: 'bg-warning-50/70',
  duplicate: 'bg-danger-50/60',
  note_inline: 'bg-zinc-100',
  outlier: 'bg-danger-50/70',
};

export function PeakTable({ peaks }: PeakTableProps) {
  if (!peaks || peaks.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500 text-sm">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
        暂无谱图峰数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium">序号</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium">组分名称</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium text-right">保留时间 (min)</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium text-right">峰面积</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium text-right">峰高</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium text-right">理论塔板数</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium">质量标记</th>
            <th className="py-2.5 px-3 border-b border-lab-100 font-medium">备注</th>
          </tr>
        </thead>
        <tbody>
          {peaks.map((peak) => {
            const Icon = qIcon[peak.dataQuality];
            return (
              <tr
                key={peak.id}
                className={cn('transition-colors', qClass[peak.dataQuality], 'hover:bg-lab-50/50')}
              >
                <td className="py-2.5 px-3 border-b border-lab-50 text-zinc-500 font-mono text-xs">#{peak.peakIndex}</td>
                <td className="py-2.5 px-3 border-b border-lab-50 font-medium text-lab-800">
                  {peak.compoundName || <span className="text-zinc-400 italic">未命名</span>}
                </td>
                <td className={cn(
                  'py-2.5 px-3 border-b border-lab-50 text-right font-mono tabular-nums',
                  peak.retentionTime === null ? 'text-warning-600' : 'text-lab-700',
                )}>
                  {formatNumber(peak.retentionTime, 3)}
                </td>
                <td className={cn(
                  'py-2.5 px-3 border-b border-lab-50 text-right font-mono tabular-nums',
                  peak.peakArea === null ? 'text-warning-600' : 'text-lab-700',
                )}>
                  {peak.inlineNote ? (
                    <span className="text-zinc-500 italic text-xs" title={peak.inlineNote}>
                      {peak.inlineNote}
                    </span>
                  ) : formatNumberInt(peak.peakArea)}
                </td>
                <td className={cn(
                  'py-2.5 px-3 border-b border-lab-50 text-right font-mono tabular-nums',
                  peak.peakHeight === null ? 'text-warning-600' : 'text-lab-700',
                )}>
                  {formatNumberInt(peak.peakHeight)}
                </td>
                <td className={cn(
                  'py-2.5 px-3 border-b border-lab-50 text-right font-mono tabular-nums',
                  peak.theoreticalPlates === null ? 'text-zinc-400' : 'text-lab-700',
                )}>
                  {formatNumberInt(peak.theoreticalPlates)}
                </td>
                <td className="py-2.5 px-3 border-b border-lab-50">
                  {peak.dataQuality !== 'normal' && Icon ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
                        peak.dataQuality === 'null' && 'bg-warning-100 text-warning-700',
                        peak.dataQuality === 'duplicate' && 'bg-danger-100 text-danger-700',
                        peak.dataQuality === 'note_inline' && 'bg-zinc-200 text-zinc-600',
                        peak.dataQuality === 'outlier' && 'bg-danger-100 text-danger-700',
                      )}
                      title={peak.note || dataQualityLabel(peak.dataQuality)}
                    >
                      <Icon className="w-3 h-3" />
                      {dataQualityLabel(peak.dataQuality)}
                    </span>
                  ) : (
                    <span className="text-xs text-success-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
                      正常
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 border-b border-lab-50 text-xs text-zinc-500 max-w-[200px] truncate">
                  {peak.note || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PeakTable;
