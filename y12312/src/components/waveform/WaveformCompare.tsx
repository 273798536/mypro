import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioFile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Waves, Maximize2, Minimize2, Play, Pause, SkipBack } from 'lucide-react';

interface WaveformCompareProps {
  originalFile: AudioFile | null;
  processedFile: AudioFile | null;
  height?: number;
}

export const WaveformCompare: React.FC<WaveformCompareProps> = ({
  originalFile,
  processedFile,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState<'original' | 'processed' | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playMode, setPlayMode] = useState<'original' | 'processed' | 'both'>('both');
  
  const { viewState, updateViewState } = useAppStore();
  const { zoomLevel } = viewState;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const drawHeight = height;
    const padding = { top: 10, right: 20, bottom: 25, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const halfHeight = (drawHeight - padding.top - padding.bottom) / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, drawHeight);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (halfHeight * 2 * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + halfHeight);
    ctx.lineTo(width - padding.right, padding.top + halfHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawWave = (
      data: Float32Array,
      yOffset: number,
      color: string,
      label: string,
      labelColor: string
    ) => {
      const step = Math.max(1, Math.floor(data.length / (chartWidth * zoomLevel)));
      const visibleLength = Math.floor(chartWidth * zoomLevel * step);
      const startSample = Math.floor(viewState.scrollPosition * (data.length - visibleLength));
      const endSample = Math.min(startSample + visibleLength, data.length);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      let x = padding.left;
      for (let i = startSample; i < endSample; i += step) {
        let min = 1;
        let max = -1;
        
        for (let j = 0; j < step && i + j < data.length; j++) {
          const val = data[i + j];
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
        
        const y1 = yOffset + halfHeight - (max * halfHeight * 0.9);
        const y2 = yOffset + halfHeight - (min * halfHeight * 0.9);
        
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        
        x++;
        if (x >= width - padding.right) break;
      }
      ctx.stroke();

      ctx.fillStyle = labelColor;
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(label, padding.left - 8, yOffset + halfHeight + 4);
    };

    if (originalFile) {
      drawWave(
        originalFile.channelData[0],
        padding.top,
        'rgba(6, 182, 212, 0.8)',
        '原始',
        'rgba(6, 182, 212, 0.9)'
      );
    }

    if (processedFile) {
      drawWave(
        processedFile.channelData[0],
        padding.top + halfHeight + 5,
        'rgba(236, 72, 153, 0.8)',
        '处理后',
        'rgba(236, 72, 153, 0.9)'
      );
    }

    const timeMarkers = [0, 0.25, 0.5, 0.75, 1];
    const duration = originalFile?.duration || processedFile?.duration || 0;
    
    timeMarkers.forEach(t => {
      const x = padding.left + chartWidth * t;
      const time = t * duration;
      
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, x, drawHeight - 8);
    });

    if (originalFile && isPlaying) {
      const playX = padding.left + (currentTime / originalFile.duration) * chartWidth;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, padding.top);
      ctx.lineTo(playX, drawHeight - padding.bottom);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(playX, padding.top + halfHeight, 4, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [originalFile, processedFile, height, zoomLevel, viewState.scrollPosition, currentTime, isPlaying]);

  useEffect(() => {
    drawWaveform();
    
    const handleResize = () => drawWaveform();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(null);
      setCurrentTime(0);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = async (target: 'original' | 'processed') => {
    if (!audioRef.current) return;
    
    const file = target === 'original' ? originalFile : processedFile;
    if (!file) return;

    if (isPlaying === target) {
      audioRef.current.pause();
      setIsPlaying(null);
    } else {
      audioRef.current.src = file.blobUrl;
      await audioRef.current.play();
      setIsPlaying(target);
      setPlayMode(target);
    }
  };

  const toggleABPlay = async () => {
    if (!audioRef.current || !originalFile || !processedFile) return;
    
    if (isPlaying === 'original' || isPlaying === 'processed') {
      audioRef.current.pause();
      setIsPlaying(null);
      return;
    }

    setPlayMode('both');
    setIsPlaying('original');
    
    const playSegment = async (file: AudioFile, label: 'original' | 'processed') => {
      if (!audioRef.current) return;
      
      audioRef.current.src = file.blobUrl;
      audioRef.current.currentTime = currentTime;
      setIsPlaying(label);
      await audioRef.current.play();
      
      return new Promise<void>((resolve) => {
        const onEnded = () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener('ended', onEnded);
          }
          resolve();
        };
        audioRef.current?.addEventListener('ended', onEnded);
      });
    };

    await playSegment(originalFile, 'original');
    await new Promise(r => setTimeout(r, 300));
    await playSegment(processedFile, 'processed');
    setIsPlaying(null);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalFile) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { left: 50, right: 20 };
    const chartWidth = rect.width - padding.left - padding.right;
    
    if (x >= padding.left && x <= rect.width - padding.right) {
      const ratio = (x - padding.left) / chartWidth;
      const newTime = ratio * originalFile.duration;
      setCurrentTime(newTime);
      if (audioRef.current && isPlaying) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const skipToStart = () => {
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative card-surface spectrum-border transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={{ height: isFullscreen ? 'calc(100vh - 32px)' : height }}
    >
      <audio ref={audioRef} />
      
      <div className="flex items-center justify-between p-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-spectrum-purple" />
          <span className="font-display font-semibold text-sm text-slate-200">波形对比</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={skipToStart}
              className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
              title="回到开始"
            >
              <SkipBack className="w-4 h-4 text-slate-400" />
            </button>
            
            <button
              onClick={() => togglePlay('original')}
              className={`p-1.5 rounded transition-colors ${
                isPlaying === 'original' 
                  ? 'bg-spectrum-cyan/20 text-spectrum-cyan' 
                  : 'hover:bg-slate-700/30 text-slate-400'
              }`}
              title="播放原始"
            >
              {isPlaying === 'original' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => togglePlay('processed')}
              className={`p-1.5 rounded transition-colors ${
                isPlaying === 'processed' 
                  ? 'bg-spectrum-pink/20 text-spectrum-pink' 
                  : 'hover:bg-slate-700/30 text-slate-400'
              }`}
              title="播放处理后"
            >
              {isPlaying === 'processed' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={toggleABPlay}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                playMode === 'both' && isPlaying
                  ? 'bg-spectrum-purple/20 text-spectrum-purple border border-spectrum-purple/30' 
                  : 'border border-slate-600/30 text-slate-400 hover:border-spectrum-purple/50'
              }`}
            >
              A/B
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateViewState({ zoomLevel: Math.max(1, zoomLevel - 0.5) })}
              className="px-2 py-1 text-[10px] font-mono rounded border border-slate-600/30 hover:border-spectrum-cyan/50 transition-colors"
            >
              -
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-8 text-center">
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={() => updateViewState({ zoomLevel: Math.min(4, zoomLevel + 0.5) })}
              className="px-2 py-1 text-[10px] font-mono rounded border border-slate-600/30 hover:border-spectrum-cyan/50 transition-colors"
            >
              +
            </button>
          </div>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>
      
      <div className="relative" style={{ height: isFullscreen ? 'calc(100% - 50px)' : height - 50 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleSeek}
        />
        
        {originalFile && (
          <div className="absolute top-1 right-2 text-[10px] font-mono text-slate-500">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(originalFile.duration / 60)}:{Math.floor(originalFile.duration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      
      {zoomLevel > 1 && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3/4">
          <input
            type="range"
            min="0"
            max="100"
            value={viewState.scrollPosition * 100}
            onChange={(e) => updateViewState({ scrollPosition: parseInt(e.target.value) / 100 })}
            className="w-full h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-spectrum-purple"
          />
        </div>
      )}
    </div>
  );
};
