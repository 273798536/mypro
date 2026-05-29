import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';

export function BeatIndicator() {
  const { currentTime, currentTrack, status } = useGameStore();
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (status !== 'playing') {
      setIsActive(false);
      return;
    }

    const beatDuration = 60000 / currentTrack.bpm;
    const beat = Math.floor(currentTime / beatDuration) % currentTrack.timeSignature[0];
    setCurrentBeat(beat);
    
    const beatProgress = (currentTime % beatDuration) / beatDuration;
    setIsActive(beatProgress < 0.1);
  }, [currentTime, currentTrack, status]);

  const beats = Array.from({ length: currentTrack.timeSignature[0] }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="text-sm text-slate-400 mr-2">节拍</div>
      <div className="flex gap-2">
        {beats.map((beat) => (
          <div
            key={beat}
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-100 ${
              currentBeat === beat && isActive
                ? beat === 0
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white scale-125 shadow-lg shadow-cyan-500/50'
                  : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white scale-110 shadow-lg shadow-slate-500/30'
                : beat === 0
                ? 'bg-slate-700 text-cyan-400 border-2 border-cyan-500/30'
                : 'bg-slate-700 text-slate-400 border border-slate-600'
            }`}
          >
            {beat + 1}
          </div>
        ))}
      </div>
      <div className="ml-4 text-2xl font-mono text-cyan-400">
        {Math.floor(currentTime / 1000).toString().padStart(2, '0')}:
        {Math.floor((currentTime % 1000) / 10).toString().padStart(2, '0')}
      </div>
    </div>
  );
}
