import type { EmotionType, ResidentEmotion } from '../../shared/types';

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

interface EmotionCardProps {
  emotion: ResidentEmotion;
}

export function EmotionCard({ emotion }: EmotionCardProps) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 py-0.5 text-xs rounded-full border ${
            emotionColors[emotion.type]
          }`}
        >
          {emotionLabels[emotion.type]}
        </span>
        {emotion.delayed && (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30 animate-pulse">
            延迟
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-amber-500 rounded-full"
            style={{ width: `${(emotion.intensity / 10) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)] w-6">
          {emotion.intensity}
        </span>
      </div>
    </div>
  );
}
