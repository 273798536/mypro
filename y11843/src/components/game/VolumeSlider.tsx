import { Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

interface VolumeSliderProps {
  partId: string;
  partName: string;
  color: string;
  isMain: boolean;
}

export function VolumeSlider({ partId, partName, color, isMain }: VolumeSliderProps) {
  const { userVolumes, setVolume, status } = useGameStore();
  const volume = userVolumes[partId] || 60;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(partId, parseInt(e.target.value));
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
      <div className="flex items-center gap-2">
        {volume > 0 ? (
          <Volume2 className="w-4 h-4" style={{ color }} />
        ) : (
          <VolumeX className="w-4 h-4 text-slate-500" />
        )}
        <span className={`text-sm font-medium ${isMain ? 'text-amber-400' : 'text-slate-300'}`}>
          {partName}
          {isMain && <span className="ml-1 text-xs">(主旋律)</span>}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative w-32 h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
            style={{
              width: `${volume}%`,
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              boxShadow: volume > 70 ? `0 0 10px ${color}` : 'none',
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            disabled={status !== 'playing' && status !== 'idle'}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
        <span className="text-sm font-mono w-10 text-right" style={{ color }}>
          {volume}
        </span>
      </div>
    </div>
  );
}
