import { Volume2, Users } from 'lucide-react';
import { SourceCard } from './SourceCard';
import { EmotionCard } from './EmotionCard';
import type { SoundSource, ResidentEmotion, RemixReport } from '../../shared/types';

interface LeftPanelProps {
  sources: SoundSource[];
  emotions: ResidentEmotion[];
  currentReport: RemixReport | undefined;
}

export function LeftPanel({ sources, emotions, currentReport }: LeftPanelProps) {
  return (
    <div className="w-72 flex flex-col gap-4 overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-400" />
          声源列表
        </h3>
        <div className="space-y-2">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              highlighted={currentReport?.sourceIds.includes(source.id)}
            />
          ))}
        </div>
      </div>
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-green-400" />
          居民情绪
        </h3>
        <div className="space-y-2">
          {emotions.map((emotion) => (
            <EmotionCard key={emotion.id} emotion={emotion} />
          ))}
        </div>
      </div>
    </div>
  );
}
