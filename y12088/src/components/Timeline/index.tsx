import React from 'react';
import { Play, Pause, SkipBack, SkipForward, FileText } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';

export const Timeline: React.FC = () => {
  const { currentTime, isPlaying, togglePlay, setCurrentTime, setShowReport } = useSandboxStore();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 bg-gray-900 border-t border-gray-700 flex items-center px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentTime(0)}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="回到开始"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={togglePlay}
          className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors shadow-lg"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={() => setCurrentTime(100)}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="跳到结束"
        >
          <SkipForward size={18} />
        </button>

        <span className="text-sm font-mono text-gray-300 w-16">
          {formatTime(currentTime)}
        </span>
      </div>

      <div className="flex-1 mx-6">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>00:00</span>
            <span>00:30</span>
            <span>01:00</span>
            <span>01:30</span>
            <span>02:00</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500 mr-4">
          <span className="text-blue-400">●</span> 蓝色路线 1号车
          <span className="text-orange-400 ml-3">●</span> 橙色路线 2号车
          <span className="text-green-400 ml-3">●</span> 绿色路线 3号车
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white text-sm font-medium transition-colors"
        >
          <FileText size={16} />
          生成报告
        </button>
      </div>
    </div>
  );
};
