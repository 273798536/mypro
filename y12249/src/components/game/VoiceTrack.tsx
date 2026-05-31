
import React from 'react';
import { Volume2, Music, Zap } from 'lucide-react';
import { VoiceState, VOICE_PARTS } from '../../types';
import { cn } from '../../lib/utils';

interface VoiceTrackProps {
  voice: VoiceState;
  isSelected: boolean;
  onSelect: () => void;
  showAnimation: boolean;
}

export const VoiceTrack: React.FC<VoiceTrackProps> = ({
  voice,
  isSelected,
  onSelect,
  showAnimation,
}) => {
  const voiceConfig = VOICE_PARTS.find((v) => v.part === voice.part);
  const syncColor = voice.syncLevel >= 80 ? 'text-green-500' : voice.syncLevel >= 60 ? 'text-yellow-500' : 'text-red-500';
  const volumePercent = voice.volume;

  return (
    <div
      className={cn(
        'relative flex-1 min-w-48 p-4 rounded-xl cursor-pointer transition-all duration-300',
        'border-2 bg-white/5 backdrop-blur-sm',
        isSelected
          ? 'border-amber-400 shadow-lg shadow-amber-400/20 scale-105'
          : 'border-white/10 hover:border-white/30',
        showAnimation && isSelected && 'animate-pulse'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music
            className="w-5 h-5"
            style={{ color: voiceConfig?.color || '#fff' }}
          />
          <span className="font-bold text-white">{voice.name}</span>
        </div>
        <div className={cn('flex items-center gap-1', syncColor)}>
          <Zap className="w-4 h-4" />
          <span className="text-sm font-semibold">{voice.syncLevel.toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-white/70">
              <Volume2 className="w-3 h-3" />
              <span className="text-xs">音量</span>
            </div>
            <span className="text-xs text-white/70">{volumePercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${volumePercent}%`,
                backgroundColor: voiceConfig?.color || '#fff',
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/70">节奏偏差</span>
            <span
              className={cn(
                'text-xs font-medium',
                Math.abs(voice.rhythmOffset) > 30 ? 'text-red-400' : 'text-green-400'
              )}
            >
              {voice.rhythmOffset > 0 ? '+' : ''}
              {voice.rhythmOffset.toFixed(1)}
            </span>
          </div>
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
            <div
              className="absolute h-full rounded-full transition-all duration-500"
              style={{
                left: `calc(50% + ${voice.rhythmOffset}%)`,
                width: '8px',
                backgroundColor: voiceConfig?.color || '#fff',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
      )}
    </div>
  );
};

