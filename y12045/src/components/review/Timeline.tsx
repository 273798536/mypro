import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Clock, AlertTriangle, Package, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { gameRecorder } from '../../engine/recorder';
import { EXCEPTION_TYPE_LABELS } from '../../config/constants';

export function Timeline() {
  const { status, reviewTime, setReviewTime, duration, enterReviewMode, exitReviewMode, time } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const events = gameRecorder.getAllEvents();
  const totalDuration = gameRecorder.getTotalDuration() || duration;
  const currentTime = status === 'reviewing' ? (reviewTime ?? 0) : time;

  const exceptionEvents = events.filter(e => e.type === 'exception_detected');
  const packageEvents = events.filter(e => 
    ['package_created', 'package_completed', 'package_failed'].includes(e.type)
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exception_detected': return <AlertTriangle size={10} className="text-red-400" />;
      case 'package_completed': return <CheckCircle size={10} className="text-green-400" />;
      case 'package_failed': return <XCircle size={10} className="text-red-400" />;
      default: return <Package size={10} className="text-blue-400" />;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (status !== 'reviewing' || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    
    setReviewTime(Math.max(0, Math.min(totalDuration, newTime)));
  };

  const handlePlayPause = () => {
    if (status !== 'reviewing') {
      enterReviewMode();
      setReviewTime(0);
    }
    
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      lastTimeRef.current = performance.now();
      const play = (timestamp: number) => {
        const delta = (timestamp - lastTimeRef.current) / 1000 * playbackSpeed;
        lastTimeRef.current = timestamp;
        
        const current = useGameStore.getState().reviewTime ?? 0;
        const newTime = current + delta;
        
        if (newTime >= totalDuration) {
          setReviewTime(totalDuration);
          setIsPlaying(false);
          return;
        }
        
        setReviewTime(newTime);
        animationRef.current = requestAnimationFrame(play);
      };
      animationRef.current = requestAnimationFrame(play);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleSkipBack = () => {
    if (status !== 'reviewing') return;
    const newTime = Math.max(0, (reviewTime ?? 0) - 5);
    setReviewTime(newTime);
  };

  const handleSkipForward = () => {
    if (status !== 'reviewing') return;
    const newTime = Math.min(totalDuration, (reviewTime ?? 0) + 5);
    setReviewTime(newTime);
  };

  const handleExitReview = () => {
    cancelAnimationFrame(animationRef.current);
    setIsPlaying(false);
    exitReviewMode();
  };

  return (
    <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-400" />
          <h3 className="text-white font-bold">复盘时间轴</h3>
        </div>
        
        {status === 'reviewing' && (
          <button
            onClick={handleExitReview}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            退出复盘
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipBack}
            className="w-8 h-8 rounded bg-[#3a3a52] hover:bg-[#4a4a62] text-white flex items-center justify-center transition-colors"
            disabled={status !== 'reviewing'}
          >
            <SkipBack size={14} />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          
          <button
            onClick={handleSkipForward}
            className="w-8 h-8 rounded bg-[#3a3a52] hover:bg-[#4a4a62] text-white flex items-center justify-center transition-colors"
            disabled={status !== 'reviewing'}
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">速度</span>
          {[0.5, 1, 2].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`
                w-10 h-7 rounded text-xs font-bold transition-colors
                ${playbackSpeed === speed ? 'bg-blue-500 text-white' : 'bg-[#3a3a52] text-gray-400 hover:bg-[#4a4a62]'}
              `}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="ml-auto font-mono text-white">
          {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
          <span className="text-gray-500"> / {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
        </div>
      </div>

      <div 
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative h-20 bg-[#1a1a2e] rounded-lg cursor-pointer overflow-hidden"
      >
        <div className="absolute inset-y-0 left-0 bg-blue-500/20 transition-all" style={{ width: `${(currentTime / totalDuration) * 100}%` }} />
        
        {exceptionEvents.map(event => (
          <div
            key={event.id}
            className="absolute top-2 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2 cursor-help"
            style={{ left: `${(event.timestamp / totalDuration) * 100}%` }}
            title={`${EXCEPTION_TYPE_LABELS[event.data.exception?.type || ''] || '异常'} - ${Math.floor(event.timestamp)}s`}
          />
        ))}

        {packageEvents.map(event => (
          <div
            key={event.id}
            className="absolute bottom-2 w-2 h-2 rounded-full transform -translate-x-1/2 cursor-help"
            style={{ 
              left: `${(event.timestamp / totalDuration) * 100}%`,
              backgroundColor: event.type === 'package_completed' ? '#00B42A' : event.type === 'package_failed' ? '#F53F3F' : '#165DFF'
            }}
            title={`${event.type === 'package_created' ? '包裹到达' : event.type === 'package_completed' ? '处理完成' : '处理失败'} - ${Math.floor(event.timestamp)}s`}
          />
        ))}

        <div 
          className="absolute inset-y-0 w-0.5 bg-white shadow-lg transform -translate-x-1/2 transition-all"
          style={{ left: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
        <span>0s</span>
        <span>{Math.floor(totalDuration / 2)}s</span>
        <span>{Math.floor(totalDuration)}s</span>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#3a3a52]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-gray-400">异常事件</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-xs text-gray-400">包裹到达</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-gray-400">处理完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-gray-400">处理失败</span>
        </div>
      </div>
    </div>
  );
}
