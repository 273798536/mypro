import { useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Rewind } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTimeShort, formatTimestamp } from '../../data/mockData';
import { FlowData, SedimentData, COLORS } from '../../types';

export function Timeline() {
  const {
    time,
    flowData,
    sedimentData,
    selectedSectionId,
    setCurrentTime,
    togglePlayback,
    setPlaybackSpeed,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { flowPoints, sedimentPoints, keyFrames } = useMemo(() => {
    const hourMs = 3600 * 1000;
    const totalDuration = time.endTime - time.startTime;

    const sectionFlowData = flowData
      .filter(f => f.sectionId === selectedSectionId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const sectionSedimentData = sedimentData
      .filter(s => s.sectionId === selectedSectionId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const flowPoints = sectionFlowData.map(f => ({
      x: ((f.timestamp - time.startTime) / totalDuration) * 100,
      y: 30 + (f.flow / 3000) * 40,
      flow: f.flow,
      timestamp: f.timestamp,
    }));

    const sedimentPoints = sectionSedimentData.map(s => ({
      x: ((s.timestamp - time.startTime) / totalDuration) * 100,
      y: 80 - (s.concentration / 0.8) * 30,
      concentration: s.concentration,
      timestamp: s.timestamp,
    }));

    const keyFrames: number[] = [];
    for (let t = time.startTime; t <= time.endTime; t += 24 * hourMs) {
      keyFrames.push(t);
    }

    return { flowPoints, sedimentPoints, keyFrames };
  }, [time.startTime, time.endTime, flowData, sedimentData, selectedSectionId]);

  const currentProgress = useMemo(() => {
    const totalDuration = time.endTime - time.startTime;
    return ((time.currentTime - time.startTime) / totalDuration) * 100;
  }, [time.currentTime, time.startTime, time.endTime]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = time.startTime + (percentage / 100) * (time.endTime - time.startTime);
    setCurrentTime(newTime);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = time.startTime + (percentage / 100) * (time.endTime - time.startTime);
    setCurrentTime(newTime);
  };

  const speedOptions = [0.5, 1, 2, 5, 10];

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border-t border-slate-600 px-4 py-3">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTime(time.startTime)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            title="回到开始"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={() => setPlaybackSpeed(Math.max(0.5, time.playbackSpeed / 2))}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            title="减速"
          >
            <Rewind size={16} />
          </button>
          <button
            onClick={togglePlayback}
            className={`p-2 rounded transition-colors ${
              time.isPlaying
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title={time.isPlaying ? '暂停' : '播放'}
          >
            {time.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={() => setPlaybackSpeed(Math.min(10, time.playbackSpeed * 2))}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            title="加速"
          >
            <FastForward size={16} />
          </button>
          <button
            onClick={() => setCurrentTime(time.endTime)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            title="跳到结束"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-600" />

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">速度:</span>
          <div className="flex gap-1">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  time.playbackSpeed === speed
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="text-right">
          <div className="text-white font-mono text-sm">
            {formatTimestamp(time.currentTime)}
          </div>
          <div className="text-slate-400 text-xs">
            {formatTimeShort(time.startTime)} - {formatTimeShort(time.endTime)}
          </div>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative h-24 bg-slate-900/50 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleTimelineClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      >
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {flowPoints.length > 1 && (
            <path
              d={`M ${flowPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke={COLORS.primary}
              strokeWidth="2"
              opacity="0.6"
            />
          )}

          {flowPoints.map((point, i) => (
            <circle
              key={`flow-${i}`}
              cx={point.x + '%'}
              cy={point.y}
              r="3"
              fill={COLORS.primary}
              opacity="0.8"
            >
              <title>{`流量: ${point.flow.toFixed(1)} m³/s`}</title>
            </circle>
          ))}

          {sedimentPoints.length > 1 && (
            <path
              d={`M ${sedimentPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke={COLORS.warning}
              strokeWidth="2"
              opacity="0.6"
              strokeDasharray="4,2"
            />
          )}

          {sedimentPoints.map((point, i) => (
            <circle
              key={`sed-${i}`}
              cx={point.x + '%'}
              cy={point.y}
              r="3"
              fill={COLORS.warning}
              opacity="0.8"
            >
              <title>{`含沙量: ${point.concentration.toFixed(3)} kg/m³`}</title>
            </circle>
          ))}
        </svg>

        {keyFrames.map((t, i) => {
          const x = ((t - time.startTime) / (time.endTime - time.startTime)) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-slate-600/50"
              style={{ left: `${x}%` }}
            >
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap">
                {formatTimeShort(t)}
              </div>
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${currentProgress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>

        <div className="absolute left-0 right-0 top-0 h-px bg-slate-600/50" style={{ top: '30%' }} />
        <div className="absolute left-0 right-0 h-px bg-slate-600/50" style={{ top: '70%' }} />

        <div className="absolute left-2 top-1 text-[10px] text-sky-400">流量</div>
        <div className="absolute left-2 bottom-1 text-[10px] text-amber-400">含沙量</div>
      </div>

      <div className="flex justify-between mt-6 text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-500" /> 流量过程
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 border-dashed" style={{ borderStyle: 'dashed' }} /> 含沙量过程
          </span>
        </div>
        <div>
          拖动滑块或点击时间轴调整时间 | 播放时3D河床和数据同步更新
        </div>
      </div>
    </div>
  );
}
