import { Volume2, Users, FileText, Check, ArrowLeft, X } from 'lucide-react';
import { SourceCard } from './SourceCard';
import { EmotionCard } from './EmotionCard';
import type { TraceEntry } from '../../shared/types';

interface TraceVisualizationProps {
  entry: TraceEntry;
}

const getJudgmentValue = (value: boolean | number | null) =>
  value === null ? '未作答' : value ? '是' : '否';
const getJudgmentColor = (value: boolean | number | null) =>
  value === null ? 'text-gray-400' : value ? 'text-green-400' : 'text-red-400';

export function TraceVisualization({ entry }: TraceVisualizationProps) {
  return (
    <div className="py-4">
      <h4 className="font-semibold mb-4 text-amber-400">溯源链可视化</h4>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            声源 ({entry.sources.length})
          </h5>
          <div className="space-y-2">
            {entry.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-8">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>

        <div className="flex-1">
          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            混音报告
          </h5>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">综合分贝</span>
              <span className="font-medium text-blue-400">{entry.report.combinedDb} dB</span>
            </div>
            <div className="space-y-1 text-xs">
              {[
                { label: '存在重叠', value: entry.report.hasOverlap, type: 'overlap' as const },
                { label: '重叠已合并', value: entry.report.overlapMerged, type: 'merged' as const },
                { label: '夜间违规', value: entry.report.violatesNightThreshold, type: 'night' as const },
              ].map(({ label, value, type }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span>
                    {value ? (
                      <Check className={`w-3 h-3 ${type === 'overlap' ? 'text-amber-400' : 'text-red-400'} inline`} />
                    ) : (
                      <X className={`w-3 h-3 ${type === 'overlap' ? 'text-gray-400' : 'text-green-400'} inline`} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-8">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>

        <div className="flex-1">
          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            审判结果
          </h5>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
            {[
              { label: '分贝叠加正确', value: entry.judgment.dbStackingCorrect },
              { label: '重叠未误合并', value: entry.judgment.overlapNotMerged },
              { label: '夜间阈值合规', value: entry.judgment.nightThresholdOk },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span className={getJudgmentColor(value)}>{getJudgmentValue(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-8">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>

        <div className="flex-1">
          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            关联情绪 ({entry.emotions.length})
          </h5>
          <div className="space-y-2">
            {entry.emotions.length === 0 ? (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] text-center">
                无关联情绪
              </div>
            ) : (
              entry.emotions.map((e) => <EmotionCard key={e.id} emotion={e} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
