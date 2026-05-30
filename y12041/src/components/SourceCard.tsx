import { Moon, Sun } from 'lucide-react';
import type { SoundSource } from '../../shared/types';

interface SourceCardProps {
  source: SoundSource;
  highlighted?: boolean;
}

export function SourceCard({ source, highlighted }: SourceCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        highlighted
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{source.name}</span>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
          {source.dbLevel} dB
        </span>
      </div>
      <div className="flex items-center gap-2">
        {source.timeSlot === 'day' ? (
          <Sun className="w-3 h-3 text-yellow-400" />
        ) : (
          <Moon className="w-3 h-3 text-blue-400" />
        )}
        <span className="text-xs text-[var(--text-secondary)]">
          {source.timeSlot === 'day' ? '白天' : '夜间'}
        </span>
        <span className="text-xs text-[var(--text-secondary)] ml-auto">
          {source.frequencyBand}
        </span>
      </div>
    </div>
  );
}
