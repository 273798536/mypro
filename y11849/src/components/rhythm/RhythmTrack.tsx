import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { rhythmPlayer } from '../../audio/RhythmPlayer';
import { audioManager } from '../../audio/AudioManager';
import { Play, Pause, Trash2, Music } from 'lucide-react';

export const RhythmTrack = () => {
  const { rhythmTrack, selectedSample, placeSample, removeSample, gameState } = useGameStore();

  useEffect(() => {
    rhythmPlayer.setBeats(rhythmTrack.beats);
  }, [rhythmTrack.beats]);

  const handleBeatClick = (index: number) => {
    if (gameState.status !== 'playing' && gameState.status !== 'paused') return;
    
    audioManager.ensureContext();

    if (rhythmTrack.beats[index]) {
      removeSample(index);
    } else if (selectedSample) {
      rhythmPlayer.checkRhythmMismatch();
      placeSample(index);
      audioManager.playSample(selectedSample);
    }
  };

  const handleTogglePlay = () => {
    audioManager.ensureContext();
    rhythmPlayer.toggle();
  };

  const getBeatColor = (index: number) => {
    const sample = rhythmTrack.beats[index];
    if (sample) return sample.color;
    return index % 2 === 0 ? '#00d4ff' : '#4a1a6b';
  };

  return (
    <div className="glass rounded-lg p-4 neon-border-cyan">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-space-cyan" />
          <span className="text-sm font-bold text-space-cyan">节奏轨</span>
          <span className="text-xs text-gray-400 ml-2">
            BPM: {rhythmTrack.bpm}
          </span>
        </div>
        
        <button
          onClick={handleTogglePlay}
          disabled={gameState.status === 'idle'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-space-cyan/20 text-space-cyan border border-space-cyan/50 hover:bg-space-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rhythmTrack.isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span className="text-sm">停止</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm">播放</span>
            </>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        {rhythmTrack.beats.map((beat, index) => (
          <div
            key={index}
            onClick={() => handleBeatClick(index)}
            className={`relative flex-1 h-20 rounded-lg cursor-pointer transition-all duration-200 ${
              rhythmTrack.currentBeat === index && rhythmTrack.isPlaying
                ? 'scale-105'
                : 'hover:scale-102'
            }`}
            style={{
              background: beat
                ? `linear-gradient(180deg, ${beat.color}60, ${beat.color}30)`
                : 'linear-gradient(180deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.05))',
              border: `2px solid ${
                rhythmTrack.currentBeat === index && rhythmTrack.isPlaying
                  ? '#00ff88'
                  : getBeatColor(index) + '60'
              }`,
              boxShadow:
                rhythmTrack.currentBeat === index && rhythmTrack.isPlaying
                  ? '0 0 20px #00ff88'
                  : beat
                  ? `0 0 10px ${beat.color}40`
                  : 'none',
            }}
          >
            <div className="absolute top-1 left-2 text-xs text-gray-400">
              {index + 1}
            </div>
            
            {beat && (
              <div className="flex flex-col items-center justify-center h-full">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: beat.color }}
                >
                  <Music className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs mt-1" style={{ color: beat.color }}>
                  {beat.soundType}
                </span>
              </div>
            )}

            {beat && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSample(index);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {!beat && selectedSample && (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-space-cyan/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        {selectedSample
          ? '点击空格子放置采样，点击已放置的采样移除'
          : '从采样槽选择一个采样'}
      </div>
    </div>
  );
};
