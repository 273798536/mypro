import { Play, Pause, RotateCcw, FastForward, Gauge } from 'lucide-react';
import { usePlayback } from '../../hooks/usePlayback';
import { useAppStore } from '../../store/useAppStore';
import { formatTimestamp } from '../../utils/formatters';
import { VelocityChart } from './VelocityChart';

export function TimelineController() {
  const {
    isPlaying,
    currentTime,
    minTime,
    maxTime,
    playbackSpeed,
    togglePlay,
    reset,
    seek,
  } = usePlayback();
  
  const { samplingGaps, setSelectedTimeRange, setPlaybackSpeed, generateReport } = useAppStore();
  
  const progress = maxTime > minTime 
    ? ((currentTime - minTime) / (maxTime - minTime)) * 100 
    : 0;
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = minTime + percentage * (maxTime - minTime);
    seek(time);
  };
  
  const handleGenerateReport = () => {
    try {
      const report = generateReport();
      alert(`报告已生成: ${report.reportNo}`);
    } catch (error) {
      alert('请先选择一个飞轮');
    }
  };
  
  return (
    <div className="industrial-card p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="industrial-btn-primary flex items-center gap-1.5 px-3 py-1.5"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? '暂停' : '播放'}
          </button>
          
          <button
            onClick={reset}
            className="industrial-btn flex items-center gap-1.5 px-3 py-1.5"
          >
            <RotateCcw size={14} />
            重置
          </button>
          
          <div className="flex items-center gap-1.5">
            <FastForward size={14} className="text-industrial-500" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="industrial-input px-2 py-1 text-xs w-20"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1.5 ml-4">
            <Gauge size={14} className="text-industrial-500" />
            <span className="data-label">当前时间:</span>
            <span className="data-value text-tech-400">{formatTimestamp(currentTime)}</span>
            <span className="text-industrial-600">/</span>
            <span className="data-value">{formatTimestamp(maxTime)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="data-label">
            采样缺口: <span className="text-alert-orange">{samplingGaps.length}</span> 处
          </span>
          <button
            onClick={handleGenerateReport}
            className="industrial-btn-primary flex items-center gap-1.5 px-3 py-1.5"
          >
            生成报告
          </button>
        </div>
      </div>
      
      <div 
        className="h-2 bg-industrial-900 rounded-sm cursor-pointer mb-3 relative overflow-hidden"
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-tech-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-0 w-0.5 h-full bg-alert-red"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />
        {samplingGaps.map(gap => {
          const startPct = ((gap.startTime - minTime) / (maxTime - minTime)) * 100;
          const endPct = ((gap.endTime - minTime) / (maxTime - minTime)) * 100;
          return (
            <div
              key={gap.id}
              className="absolute top-0 h-full bg-alert-orange/40"
              style={{
                left: `${startPct}%`,
                width: `${endPct - startPct}%`,
              }}
              title={`采样缺口: ${gap.startTime.toFixed(1)}s - ${gap.endTime.toFixed(1)}s`}
            />
          );
        })}
      </div>
      
      <div className="flex-1 min-h-0">
        <VelocityChart
          currentTime={currentTime}
          onTimeClick={seek}
          onRangeChange={setSelectedTimeRange}
          gaps={samplingGaps}
        />
      </div>
    </div>
  );
}
