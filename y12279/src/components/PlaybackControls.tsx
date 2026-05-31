import { Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useState } from 'react';
import { ErrorType, ErrorSeverity } from '@/types';
import { cn } from '@/lib/utils';

export function PlaybackControls() {
  const { 
    isPlaying, 
    setPlaying, 
    currentTime, 
    playbackSpeed, 
    setPlaybackSpeed,
    setCurrentTime,
    session,
    addManualError
  } = usePlaybackStore();
  
  const [showAddError, setShowAddError] = useState(false);
  const [newError, setNewError] = useState({
    type: 'missing_keypoint' as ErrorType,
    description: '',
    severity: 'medium' as ErrorSeverity,
  });

  const handlePlayPause = () => {
    setPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 1));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(session.totalDuration, currentTime + 1));
  };

  const handleReset = () => {
    setCurrentTime(0);
    setPlaying(false);
  };

  const handleAddError = () => {
    const currentMeasure = session.measures.find(
      m => currentTime >= m.startTime && currentTime < m.endTime
    );
    
    addManualError({
      type: newError.type,
      description: newError.description || '人工补录错误标记',
      severity: newError.severity,
      timestamp: currentTime,
      measureNumber: currentMeasure?.measureNumber || 0,
      affectedKeyframeIds: [],
    });
    
    setShowAddError(false);
    setNewError({ type: 'missing_keypoint', description: '', severity: 'medium' });
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-slate-700">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleSkipBack}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
            title="后退1秒"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayPause}
            className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors text-white shadow-lg"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </motion.button>
          
          <button
            onClick={handleSkipForward}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
            title="前进1秒"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={session.totalDuration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          
          <span className="text-sm font-mono text-slate-300 w-24 text-right">
            {currentTime.toFixed(1)}s / {session.totalDuration.toFixed(1)}s
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">播放速度:</span>
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  playbackSpeed === speed
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowAddError(!showAddError)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white"
          >
            <Tag className="w-3 h-3" />
            补录错误标签
          </button>
        </div>
        
        {showAddError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-slate-700"
          >
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">错误类型</label>
                <select
                  value={newError.type}
                  onChange={(e) => setNewError({ ...newError, type: e.target.value as ErrorType })}
                  className="w-full px-3 py-2 text-sm rounded bg-slate-700 border border-slate-600 text-white"
                >
                  <option value="missing_keypoint">关键点丢失</option>
                  <option value="measure_misalignment">小节错位</option>
                  <option value="hand_confusion">左右手混淆</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">严重程度</label>
                <select
                  value={newError.severity}
                  onChange={(e) => setNewError({ ...newError, severity: e.target.value as ErrorSeverity })}
                  className="w-full px-3 py-2 text-sm rounded bg-slate-700 border border-slate-600 text-white"
                >
                  <option value="low">轻微</option>
                  <option value="medium">中等</option>
                  <option value="high">严重</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">时间点</label>
                <div className="px-3 py-2 text-sm rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono">
                  {currentTime.toFixed(2)}s
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="错误描述（可选）"
                value={newError.description}
                onChange={(e) => setNewError({ ...newError, description: e.target.value })}
                className="flex-1 px-3 py-2 text-sm rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-400"
              />
              <button
                onClick={handleAddError}
                className="px-4 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500 transition-colors text-white"
              >
                添加标记
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
