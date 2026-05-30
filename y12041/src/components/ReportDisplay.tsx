import type { RemixReport, SoundSource } from '../../shared/types';

interface ReportDisplayProps {
  report: RemixReport;
  sources: SoundSource[];
  reportIndex: number;
}

export function ReportDisplay({ report, sources, reportIndex }: ReportDisplayProps) {
  const isNightViolation = report.violatesNightThreshold;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">混音报告 #{reportIndex + 1}</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isNightViolation
              ? 'bg-red-500/20 text-red-400'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          综合分贝：{report.combinedDb} dB
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-[var(--text-secondary)] mb-2">涉及声源：</p>
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <span
              key={s.id}
              className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-full border border-amber-500/30"
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-lg border ${
            report.hasOverlap
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">存在频率重叠</p>
          <p className="font-medium">{report.hasOverlap ? '是' : '否'}</p>
        </div>
        <div
          className={`p-4 rounded-lg border ${
            report.overlapMerged
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">重叠已合并</p>
          <p className="font-medium">{report.overlapMerged ? '是' : '否'}</p>
        </div>
        <div
          className={`p-4 rounded-lg border ${
            isNightViolation
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">夜间阈值违规</p>
          <p className="font-medium">{isNightViolation ? '是' : '否'}</p>
        </div>
      </div>
    </div>
  );
}
