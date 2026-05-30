import { Clock } from 'lucide-react';
import type { EmotionType, Judgment, ResidentEmotion } from '../../shared/types';

const emotionLabels: Record<EmotionType, string> = {
  annoyed: '烦躁',
  anxious: '焦虑',
  calm: '平静',
  sleepless: '失眠',
};

const emotionColors: Record<EmotionType, string> = {
  annoyed: 'text-red-400 bg-red-500/20 border-red-500/30',
  anxious: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  calm: 'text-green-400 bg-green-500/20 border-green-500/30',
  sleepless: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
};

interface SettlementPanelProps {
  totalScore: number;
  avgEmotionModifier: number;
  isNightViolation: boolean | number | undefined;
  nightThresholdDb: number;
  delayedCountdown: number | null;
  delayedEmotions: ResidentEmotion[];
  judgments: Judgment[];
}

export function SettlementPanel({
  totalScore,
  avgEmotionModifier,
  isNightViolation,
  nightThresholdDb,
  delayedCountdown,
  delayedEmotions,
  judgments,
}: SettlementPanelProps) {
  return (
    <div className="w-72 flex flex-col gap-4 overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-white/10">
        <h3 className="font-semibold mb-4">实时结算</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-[var(--text-secondary)] mb-1">累计得分</p>
            <p className="text-3xl font-bold text-amber-400">{totalScore}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-[var(--text-secondary)] mb-1">平均情绪修正</p>
            <p
              className={`text-2xl font-bold ${
                avgEmotionModifier >= 1.0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              x{avgEmotionModifier.toFixed(2)}
            </p>
          </div>
          <div
            className={`p-4 rounded-lg border ${
              isNightViolation
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-green-500/10 border-green-500/30'
            }`}
          >
            <p className="text-xs text-[var(--text-secondary)] mb-1">夜间阈值状态</p>
            <p
              className={`text-lg font-medium ${
                isNightViolation ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {isNightViolation ? '⚠️ 已违规' : '✓ 合规'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              阈值：{nightThresholdDb} dB
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          情绪预警
        </h3>
        {delayedCountdown !== null ? (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-sm text-purple-300 mb-2">
              延迟情绪将在 <span className="font-bold">{delayedCountdown}</span> 秒后补来...
            </p>
            <div className="flex flex-wrap gap-1">
              {delayedEmotions.map((e) => (
                <span
                  key={e.id}
                  className={`px-2 py-0.5 text-xs rounded-full border animate-pulse ${
                    emotionColors[e.type]
                  }`}
                >
                  {emotionLabels[e.type]}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">暂无延迟情绪</p>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-white/10">
        <h3 className="font-semibold mb-3">已完成审判</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {judgments.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">暂无审判记录</p>
          ) : (
            [...judgments].reverse().map((j, idx) => (
              <div
                key={j.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    #{judgments.length - idx}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      j.score >= 20 ? 'text-green-400' : j.score >= 10 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    +{j.score}
                  </span>
                </div>
                {j.emotionIds && j.emotionIds.length > 0 && (
                  <div className="mt-1 text-xs text-purple-400">
                    已关联 {j.emotionIds.length} 个情绪
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
