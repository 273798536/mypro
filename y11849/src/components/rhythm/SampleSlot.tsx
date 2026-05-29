import { useGameStore } from '../../store/gameStore';
import { SampleCard } from './SampleCard';
import { Disc } from 'lucide-react';

export const SampleSlot = () => {
  const { samples, selectedSample } = useGameStore();

  return (
    <div className="glass rounded-lg p-4 neon-border-pink">
      <div className="flex items-center gap-2 mb-3">
        <Disc className="w-5 h-5 text-space-pink" />
        <span className="text-sm font-bold text-space-pink">采样槽</span>
        <span className="text-xs text-gray-400 ml-auto">
          {samples.length} 个采样
        </span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[80px]">
        {samples.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-500 text-sm">
            收集星球获取采样...
          </div>
        ) : (
          samples.map(sample => (
            <SampleCard
              key={sample.id}
              sample={sample}
              isSelected={selectedSample?.id === sample.id}
            />
          ))
        )}
      </div>
      
      {selectedSample && (
        <div className="mt-3 pt-3 border-t border-space-pink/30">
          <div className="text-xs text-space-pink">
            已选择: {selectedSample.soundType} - 点击节奏轨放置
          </div>
        </div>
      )}
    </div>
  );
};
