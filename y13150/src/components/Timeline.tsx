import { useRef, useState, useMemo, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Clock, Filter } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function Timeline() {
  const {
    notes,
    timeRange,
    setTimeRange,
    currentTime,
    setCurrentTime,
    selectedObjectId,
    selectedNoteId,
    selectNote,
    objects
  } = useAppStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<number | null>(null);

  const allTimestamps = useMemo(() => {
    const timestamps = notes.map(n => new Date(n.timestamp).getTime());
    if (timestamps.length === 0) {
      const now = Date.now();
      return [now - 7 * 24 * 60 * 60 * 1000, now];
    }
    return timestamps.sort((a, b) => a - b);
  }, [notes]);

  const minTime = allTimestamps[0];
  const maxTime = allTimestamps[allTimestamps.length - 1];
  const totalDuration = maxTime - minTime;

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedObjectId) {
      result = notes.filter(n => n.objectId === selectedObjectId);
    }
    return result.filter(n => {
      const t = new Date(n.timestamp).getTime();
      return t >= timeRange.start && t <= timeRange.end;
    });
  }, [notes, selectedObjectId, timeRange]);

  const noteEvents = useMemo(() => {
    return filteredNotes.map(note => {
      const t = new Date(note.timestamp).getTime();
      const position = totalDuration > 0 ? ((t - minTime) / totalDuration) * 100 : 50;
      const object = objects.find(o => o.id === note.objectId);
      return { note, position, object };
    });
  }, [filteredNotes, objects, minTime, maxTime, totalDuration]);

  const formatTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatTimeTooltip = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentPosition = totalDuration > 0
    ? ((currentTime - minTime) / totalDuration) * 100
    : 50;

  useEffect(() => {
    if (isPlaying && totalDuration > 0) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (totalDuration / 100);
          if (next > maxTime) {
            setIsPlaying(false);
            return minTime;
          }
          return next;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, minTime, maxTime, totalDuration, setCurrentTime]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalDuration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = minTime + percentage * totalDuration;
    setCurrentTime(newTime);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 10);
    setZoom(newZoom);
    const center = (timeRange.start + timeRange.end) / 2;
    const newDuration = totalDuration / newZoom;
    setTimeRange({
      start: Math.max(minTime, center - newDuration / 2),
      end: Math.min(maxTime, center + newDuration / 2)
    });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 1);
    setZoom(newZoom);
    if (newZoom === 1) {
      setTimeRange({ start: minTime, end: maxTime });
      return;
    }
    const center = (timeRange.start + timeRange.end) / 2;
    const newDuration = totalDuration / newZoom;
    setTimeRange({
      start: Math.max(minTime, center - newDuration / 2),
      end: Math.min(maxTime, center + newDuration / 2)
    });
  };

  const handleSkipBack = () => {
    const prevNotes = filteredNotes
      .map(n => new Date(n.timestamp).getTime())
      .filter(t => t < currentTime)
      .sort((a, b) => b - a);
    if (prevNotes.length > 0) {
      const targetTime = prevNotes[0];
      setCurrentTime(targetTime);
      const targetNote = filteredNotes.find(n => new Date(n.timestamp).getTime() === targetTime);
      if (targetNote) {
        selectNote(targetNote.id);
        const windowSize = Math.max(totalDuration / 10, 24 * 60 * 60 * 1000);
        setTimeRange({
          start: Math.max(minTime, targetTime - windowSize / 2),
          end: Math.min(maxTime, targetTime + windowSize / 2)
        });
      }
    } else {
      setCurrentTime(minTime);
    }
  };

  const handleSkipForward = () => {
    const nextNotes = filteredNotes
      .map(n => new Date(n.timestamp).getTime())
      .filter(t => t > currentTime)
      .sort((a, b) => a - b);
    if (nextNotes.length > 0) {
      const targetTime = nextNotes[0];
      setCurrentTime(targetTime);
      const targetNote = filteredNotes.find(n => new Date(n.timestamp).getTime() === targetTime);
      if (targetNote) {
        selectNote(targetNote.id);
        const windowSize = Math.max(totalDuration / 10, 24 * 60 * 60 * 1000);
        setTimeRange({
          start: Math.max(minTime, targetTime - windowSize / 2),
          end: Math.min(maxTime, targetTime + windowSize / 2)
        });
      }
    } else {
      setCurrentTime(maxTime);
    }
  };

  return (
    <div className="h-24 bg-lab-panel border-t border-lab-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-lab-border/50">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">
            {formatTimeLabel(minTime)} - {formatTimeLabel(maxTime)}
          </span>
          <span className="text-xs text-gray-500 mx-2">|</span>
          <span className="text-xs text-gray-400">
            当前: {formatTimeTooltip(currentTime)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1.5 rounded hover:bg-lab-border text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{zoom.toFixed(1)}x</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 10}
            className="p-1.5 rounded hover:bg-lab-border text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <span className="w-px h-4 bg-lab-border mx-1" />
          <button
            onClick={handleSkipBack}
            className="p-1.5 rounded hover:bg-lab-border text-gray-400 hover:text-white transition-colors"
            title="上一个事件"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded transition-colors ${
              isPlaying
                ? 'bg-lab-accent text-white'
                : 'hover:bg-lab-border text-gray-400 hover:text-white'
            }`}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={handleSkipForward}
            className="p-1.5 rounded hover:bg-lab-border text-gray-400 hover:text-white transition-colors"
            title="下一个事件"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center px-4 relative">
        <div className="absolute left-4 right-4 top-1/2 h-1 bg-lab-border rounded-full" />
        
        <div
          ref={timelineRef}
          className="absolute left-4 right-4 h-8 top-1/2 -translate-y-1/2 cursor-pointer z-10"
          onClick={handleTimelineClick}
        >
          {noteEvents.map((event, index) => (
            <div
              key={`${event.note.id}-${index}`}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${event.position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                const noteTime = new Date(event.note.timestamp).getTime();
                setCurrentTime(noteTime);
                selectNote(event.note.id);
                const windowSize = Math.max(totalDuration / 10, 24 * 60 * 60 * 1000);
                setTimeRange({
                  start: Math.max(minTime, noteTime - windowSize / 2),
                  end: Math.min(maxTime, noteTime + windowSize / 2)
                });
              }}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-150 ${
                  event.note.id === selectedNoteId
                    ? 'ring-2 ring-lab-accent ring-offset-2 ring-offset-lab-panel scale-125'
                    : ''
                } ${
                  event.object
                    ? 'border-white'
                    : 'bg-gray-500 border-gray-300'
                }`}
                style={{
                  backgroundColor: event.object?.color || '#6B7280',
                  boxShadow: event.note.id === selectedNoteId 
                    ? '0 0 12px rgba(6, 182, 212, 0.8)' 
                    : '0 0 4px rgba(0,0,0,0.5)'
                }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-lab-bg border border-lab-border rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <div className="text-xs text-white font-medium">
                    {event.object?.name || '未知对象'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTimeTooltip(new Date(event.note.timestamp).getTime())}
                  </div>
                  <div className="text-xs text-gray-500 max-w-48 truncate">
                    {event.note.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-lab-accent z-20 pointer-events-none"
            style={{ left: `${currentPosition}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-lab-accent rounded-full border-2 border-white" />
          </div>
        </div>

        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-gray-500 pb-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const t = minTime + (totalDuration / 5) * i;
            return (
              <span key={i} className="transform -translate-x-1/2" style={{ marginLeft: '0' }}>
                {formatTimeLabel(t)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-1 bg-lab-bg/50 border-t border-lab-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <Filter size={12} />
          <span>{filteredNotes.length} 条记录</span>
          <span className="text-lab-border">|</span>
          <span>
            时间范围: {formatTimeTooltip(timeRange.start)} - {formatTimeTooltip(timeRange.end)}
          </span>
          {selectedObjectId && (
            <>
              <span className="text-lab-border">|</span>
              <span className="text-lab-accent">
                对象: {objects.find(o => o.id === selectedObjectId)?.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-lab-accent" />
            当前时间
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            备注事件
          </span>
        </div>
      </div>
    </div>
  );
}
