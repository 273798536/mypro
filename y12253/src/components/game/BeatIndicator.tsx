import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const BeatIndicator: React.FC = () => {
  const { isBeatWindow, beatIndex, setBeatWindow, currentPhase, updateSonarPulse } = useGameStore();
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (currentPhase !== 'playing') return;

    const bpm = 60;
    const beatInterval = (60 / bpm) * 1000;
    const windowDuration = 500;
    let localBeatIndex = 0;

    const beatCycle = () => {
      localBeatIndex++;
      setBeatWindow(true, localBeatIndex);
      
      if (audioContextRef.current) {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + 0.1);
      }

      setTimeout(() => {
        setBeatWindow(false, localBeatIndex);
      }, windowDuration);
    };

    const interval = setInterval(beatCycle, beatInterval);
    
    beatCycle();

    return () => {
      clearInterval(interval);
    };
  }, [currentPhase, setBeatWindow]);

  useEffect(() => {
    if (currentPhase !== 'playing') return;

    const updateInterval = setInterval(() => {
      updateSonarPulse();
    }, 16);

    return () => {
      clearInterval(updateInterval);
    };
  }, [currentPhase, updateSonarPulse]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const beats = [0, 1, 2, 3];

  return (
    <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50" onClick={initAudio}>
      <h3 className="text-tech-cyan-500 font-display text-sm mb-3">声呐节拍</h3>
      
      <div className="flex justify-center gap-3 mb-3">
        {beats.map(beat => {
          const isActive = beatIndex % 4 === beat && isBeatWindow;
          return (
            <div
              key={beat}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-100 ${
                isActive
                  ? 'bg-sonar-green-500 scale-125 shadow-glow-green'
                  : 'bg-deep-ocean-800 border border-deep-ocean-700'
              }`}
            >
              <span className={`text-xs font-mono ${
                isActive ? 'text-deep-ocean-950' : 'text-gray-500'
              }`}>
                {beat + 1}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-2 bg-deep-ocean-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            isBeatWindow ? 'w-full bg-sonar-green-500' : 'w-0 bg-sonar-green-500/50'
          }`}
        />
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        {isBeatWindow ? '在节拍窗口内做出决策' : '准备下一拍...'}
      </p>
    </div>
  );
};

export default BeatIndicator;
