import type { Emotion } from '@/types';
import { EMOTION_LABELS } from '@/types';
import { AlertCircle, Smile, Meh, Frown, Angry } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmotionBadgeProps {
  emotion: Emotion;
  confidence?: number | null;
  showConfidence?: boolean;
}

const emotionConfig = {
  angry: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: Angry,
    pulse: true,
  },
  frustrated: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: Frown,
    pulse: false,
  },
  neutral: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: Meh,
    pulse: false,
  },
  satisfied: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: Smile,
    pulse: false,
  },
};

export function EmotionBadge({ emotion, confidence, showConfidence = true }: EmotionBadgeProps) {
  if (!emotion) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3 text-gray-400" />
        <span className="text-gray-400 text-xs">未识别</span>
      </div>
    );
  }

  const config = emotionConfig[emotion];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${config.bg} ${config.border} transition-all duration-300`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.text} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-medium ${config.text}`}>
        {EMOTION_LABELS[emotion]}
      </span>
      {showConfidence && confidence !== null && confidence !== undefined && (
        <span className="text-gray-500 text-xs">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
