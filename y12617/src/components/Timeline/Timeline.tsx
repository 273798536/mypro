import React, { useRef, useState, useEffect } from 'react';
import { usePhysicsStore, useAnnotationStore, useLevelStore } from '../../store';
import { formatTime } from '../../utils/time';
import type { AnnotationType, Annotation } from '../../types/annotation';

const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  boundary_error: '#F53F3F',
  collision_miss: '#FF7D00',
  missing_unit: '#FF7D00',
  duplicate: '#722ED1',
  normal: '#00B42A',
  other: '#86909C',
};

interface TimelineProps {
  duration?: number;
  annotations?: Annotation[];
}

export const Timeline: React.FC<TimelineProps> = ({ duration: propDuration, annotations: propAnnotations }) => {
  const { currentTime, seekTo, isPlaying, pause } = usePhysicsStore();
  const { annotations: storeAnnotations } = useAnnotationStore();
  const { currentLevel } = useLevelStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const level = currentLevel;
  const annotations = propAnnotations || storeAnnotations;
  const levelAnnotations = level
    ? annotations.filter((a) => a.levelId === level.id)
    : annotations;

  const totalDuration = propDuration || level?.duration || 30;
  const progress = Math.min((currentTime / totalDuration) * 100, 100);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * totalDuration;
    
    if (isPlaying) {
      pause();
    }
    seekTo(time);
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
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * totalDuration;
    
    seekTo(time);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', (e) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const time = percentage * totalDuration;
        seekTo(time);
      });
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousemove', () => {});
      };
    }
  }, [isDragging, totalDuration]);

  useEffect(() => {
    if (isDragging && isPlaying) {
      pause();
    }
  }, [isDragging, isPlaying, pause]);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-neutral-600">时间轴</span>
        <span className="font-mono text-sm text-neutral-500">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
      
      <div
        ref={timelineRef}
        className="relative h-12 bg-neutral-100 rounded-lg cursor-pointer group"
        onClick={handleTimelineClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="absolute inset-0 flex items-center px-2">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: `${(i * 5 / totalDuration) * 100}%` }}
            >
              <div className="w-px h-4 bg-neutral-300"></div>
              <span className="absolute top-5 left-1/2 -translate-x-1/2 text-xs text-neutral-400">
                {i * 5}s
              </span>
            </div>
          ))}
        </div>

        <div
          className="absolute top-0 left-0 h-full bg-primary-100 rounded-l-lg transition-all"
          style={{ width: `${progress}%` }}
        />

        <div
          className="absolute top-0 h-full w-1 bg-primary-500 rounded-full shadow-lg z-10 transition-all"
          style={{ left: `calc(${progress}% - 2px)` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-5 h-5 bg-primary-500 rounded-full shadow-md border-2 border-white group-hover:scale-110 transition-transform" />
        </div>

        {levelAnnotations.map((annotation) => {
          const position = (annotation.timePoint / totalDuration) * 100;
          const color = ANNOTATION_COLORS[annotation.type];
          
          return (
            <div
              key={annotation.id}
              className="absolute top-1/2 -translate-y-1/2 cursor-pointer hover:z-20 group/marker"
              style={{ left: `calc(${position}% - 6px)` }}
              title={`${formatTime(annotation.timePoint)}: ${annotation.content.substring(0, 30)}...`}
            >
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm transition-transform group-hover/marker:scale-150"
                style={{ backgroundColor: color }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                {formatTime(annotation.timePoint)}: {annotation.content.substring(0, 30)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS.normal }} />
          <span className="text-xs text-neutral-500">正常</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS.boundary_error }} />
          <span className="text-xs text-neutral-500">边界误判</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS.collision_miss }} />
          <span className="text-xs text-neutral-500">漏标/缺单位</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS.duplicate }} />
          <span className="text-xs text-neutral-500">重复标注</span>
        </div>
      </div>
    </div>
  );
};
