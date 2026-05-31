import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const AudioPlayer: React.FC = () => {
  const { isPlaying, playbackTime, setPlaybackTime, togglePlay, measures, currentAudioClipId } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const currentClip = useStore((state) => 
    state.audioClips.find((c) => c.id === state.currentAudioClipId)
  );

  const totalDuration = currentClip?.duration || 16;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const barCount = 150;
    const barWidth = width / barCount;
    const gap = 1;
    
    for (let i = 0; i < barCount; i++) {
      const progress = i / barCount;
      const barHeight = Math.sin(progress * Math.PI * 4) * 20 + 
                        Math.sin(progress * Math.PI * 8) * 10 + 
                        Math.random() * 15 + 20;
      
      const isPast = progress < playbackTime / totalDuration;
      
      ctx.fillStyle = isPast ? '#8B2635' : '#383838';
      ctx.fillRect(
        i * barWidth + gap,
        (height - barHeight) / 2,
        barWidth - gap * 2,
        barHeight
      );
    }

    const playheadX = (playbackTime / totalDuration) * width;
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(playheadX - 1, 0, 2, height);

    measures.forEach((measure) => {
      const x = (measure.startTime / totalDuration) * width;
      ctx.fillStyle = '#515151';
      ctx.fillRect(x, 0, 1, height);
      
      ctx.fillStyle = '#818181';
      ctx.font = '10px "Source Code Pro", monospace';
      ctx.fillText(`m${measure.measureNumber}`, x + 4, 12);
    });
  }, [playbackTime, measures, totalDuration]);

  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now();
      const startPlayback = playbackTime;
      
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = startPlayback + elapsed;
        
        if (newTime >= totalDuration) {
          setPlaybackTime(0);
          return;
        }
        
        setPlaybackTime(newTime);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / canvas.width) * totalDuration;
    setPlaybackTime(newTime);
  };

  const skipBack = () => {
    const newTime = Math.max(0, playbackTime - 2);
    setPlaybackTime(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(totalDuration, playbackTime + 2);
    setPlaybackTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-jazz-ink-800 rounded-lg p-4 border border-jazz-ink-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-jazz-ink-100">
          {currentClip?.name || '未选择录音'}
        </h3>
        <span className="text-jazz-ink-400 text-sm font-mono">
          {formatTime(playbackTime)} / {formatTime(totalDuration)}
        </span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={80}
        className="w-full rounded cursor-pointer"
        onClick={handleCanvasClick}
      />
      
      <div className="flex items-center justify-center gap-6 mt-4">
        <button
          onClick={skipBack}
          className="p-2 rounded-full hover:bg-jazz-ink-700 transition-colors text-jazz-ink-300 hover:text-jazz-ink-100"
        >
          <SkipBack size={20} />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-3 rounded-full bg-jazz-burgundy-700 hover:bg-jazz-burgundy-600 transition-colors text-white shadow-lg hover:shadow-jazz-burgundy-900/30"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        
        <button
          onClick={skipForward}
          className="p-2 rounded-full hover:bg-jazz-ink-700 transition-colors text-jazz-ink-300 hover:text-jazz-ink-100"
        >
          <SkipForward size={20} />
        </button>
        
        <div className="flex items-center gap-2 ml-4 text-jazz-ink-400">
          <Volume2 size={18} />
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            className="w-20 accent-jazz-burgundy-600"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-xs text-jazz-ink-500">BPM: {currentClip?.bpm || 120}</span>
        <span className="text-jazz-ink-600">|</span>
        <span className="text-xs text-jazz-ink-500">{currentClip?.timeSignature || '4/4'}</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
