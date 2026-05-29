import type { Sample } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { audioManager } from '../../audio/AudioManager';
import { Music } from 'lucide-react';

interface SampleCardProps {
  sample: Sample;
  isSelected: boolean;
}

export const SampleCard = ({ sample, isSelected }: SampleCardProps) => {
  const { selectSample } = useGameStore();

  const handleClick = () => {
    audioManager.playSample(sample);
    selectSample(isSelected ? null : sample);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-lg cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'scale-110 shadow-lg'
          : 'hover:scale-105'
      }`}
      style={{
        background: `linear-gradient(135deg, ${sample.color}40, ${sample.color}20)`,
        border: `2px solid ${isSelected ? sample.color : sample.color + '60'}`,
        boxShadow: isSelected ? `0 0 15px ${sample.color}` : 'none',
      }}
    >
      <Music
        className="w-6 h-6"
        style={{ color: sample.color }}
      />
      <span
        className="text-xs mt-1 font-mono"
        style={{ color: sample.color }}
      >
        {sample.soundType}
      </span>
    </div>
  );
};
