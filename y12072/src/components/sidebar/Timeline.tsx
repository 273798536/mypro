import { useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/dataMapper';
import { QUALITY_COLORS } from '../../utils/colorScheme';

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const segments = useAppStore(state => state.segments);
  const currentTime = useAppStore(state => state.currentTime);
  const isPlaying = useAppStore(state => state.isPlaying);
  const totalDuration = useAppStore(state => state.totalDuration);
  const filters = useAppStore(state => state.filters);
  const setTime = useAppStore(state => state.setTime);
  const togglePlay = useAppStore(state => state.togglePlay);
  const selectedSegmentId = useAppStore(state => state.selectedSegmentId);
  const selectSegment = useAppStore(state => state.selectSegment);

  useEffect(() => {
    if (!isPlaying) return;
    
    const startTime = performance.now();
    const startPos = currentTime;
    
    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const newTime = Math.min(startPos + elapsed, totalDuration);
      setTime(newTime);
      
      if (newTime < totalDuration) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, totalDuration, setTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#1E1E2A';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    segments.forEach(segment => {
      const x = (segment.startTime / totalDuration) * rect.width;
      const width = (segment.duration / totalDuration) * rect.width;
      
      ctx.fillStyle = QUALITY_COLORS[segment.quality];
      ctx.fillRect(x, 0, width, rect.height);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const waveform = segment.waveformData;
      const barWidth = width / waveform.length;
      waveform.forEach((val, i) => {
        const barHeight = ((val + 1) / 2) * rect.height * 0.6;
        ctx.fillRect(
          x + i * barWidth,
          rect.height / 2 - barHeight / 2,
          Math.max(barWidth - 1, 1),
          barHeight
        );
      });
      
      if (segment.id === selectedSegmentId) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, 1, width - 2, rect.height - 2);
      }
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px Inter';
      ctx.fillText(segment.name.split('：')[0], x + 4, 14);
    });
    
    const filterStartX = (filters.timeRange[0] / totalDuration) * rect.width;
    const filterEndX = (filters.timeRange[1] / totalDuration) * rect.width;
    ctx.fillStyle = 'rgba(139, 35, 35, 0.2)';
    ctx.fillRect(filterStartX, 0, filterEndX - filterStartX, rect.height);
    
    const playheadX = (currentTime / totalDuration) * rect.width;
    ctx.strokeStyle = '#8B2323';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, rect.height);
    ctx.stroke();
    
    ctx.fillStyle = '#8B2323';
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX - 6, -8);
    ctx.lineTo(playheadX + 6, -8);
    ctx.closePath();
    ctx.fill();
  }, [segments, currentTime, totalDuration, filters, selectedSegmentId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * totalDuration;
    
    const clickedSegment = segments.find(
      s => clickedTime >= s.startTime && clickedTime <= s.endTime
    );
    
    if (clickedSegment) {
      selectSegment(clickedSegment.id);
    }
    
    setTime(clickedTime);
  };

  const skipBackward = () => {
    setTime(Math.max(0, currentTime - 5));
  };

  const skipForward = () => {
    setTime(Math.min(totalDuration, currentTime + 5));
  };

  return (
    <div className="bg-[#1E1E2A] rounded-lg p-3 border border-[#3A3A4A]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#F5F0E6] font-medium text-sm">时间轴</span>
        <span className="text-[#A0A0A0] text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-20 rounded cursor-pointer mb-3"
        onClick={handleCanvasClick}
      />
      
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipBackward}
          className="p-2 hover:bg-[#2A2A3A] rounded transition-colors"
        >
          <SkipBack size={16} className="text-[#F5F0E6]" />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-3 bg-[#8B2323] hover:bg-[#A52A2A] rounded-full transition-colors"
        >
          {isPlaying ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white" />
          )}
        </button>
        
        <button
          onClick={skipForward}
          className="p-2 hover:bg-[#2A2A3A] rounded transition-colors"
        >
          <SkipForward size={16} className="text-[#F5F0E6]" />
        </button>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2">
        {segments.slice(0, 4).map(segment => (
          <button
            key={segment.id}
            onClick={() => selectSegment(segment.id)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              selectedSegmentId === segment.id
                ? 'bg-[#8B2323] text-white'
                : 'bg-[#2A2A3A] text-[#A0A0A0] hover:text-white'
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: QUALITY_COLORS[segment.quality] }}
            />
            {segment.name.split('：')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
