import { useRef, useCallback } from 'react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { PlaybackControls } from './PlaybackControls';
import { KeyframeMarkers } from './KeyframeMarkers';
import { formatTime } from '../../utils/math';

export const Timeline = () => {
  const { playbackState, validatedFrames, goToFrame } = useAttitudeStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || validatedFrames.length === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const frameIndex = Math.round(percentage * (validatedFrames.length - 1));
      goToFrame(frameIndex);
    },
    [validatedFrames.length, goToFrame]
  );

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current || !timelineRef.current || validatedFrames.length === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const frameIndex = Math.round(percentage * (validatedFrames.length - 1));
      goToFrame(frameIndex);
    },
    [validatedFrames.length, goToFrame]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMarkerClick = useCallback(
    (frameIndex: number) => {
      goToFrame(frameIndex);
    },
    [goToFrame]
  );

  const progress =
    validatedFrames.length > 0
      ? (playbackState.currentFrame / (validatedFrames.length - 1)) * 100
      : 0;

  const totalDuration =
    validatedFrames.length > 0
      ? validatedFrames[validatedFrames.length - 1].timestamp
      : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2"
      style={{
        background: 'linear-gradient(to top, rgba(10, 22, 40, 0.98) 0%, rgba(10, 22, 40, 0.8) 80%, transparent 100%)',
      }}
    >
      <PlaybackControls />

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono" style={{ color: '#64748b' }}>
            {formatTime(0)}
          </span>
          <span className="text-xs font-mono" style={{ color: '#64748b' }}>
            {formatTime(totalDuration)}
          </span>
        </div>

        <div
          ref={timelineRef}
          className="relative h-6 cursor-pointer"
          onClick={handleTimelineClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full overflow-hidden"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: '#1890ff',
                boxShadow: '0 0 8px #1890ff80',
              }}
            />
          </div>

          <KeyframeMarkers duration={totalDuration} onMarkerClick={handleMarkerClick} />

          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all"
            style={{
              left: `calc(${progress}% - 8px)`,
              backgroundColor: '#1890ff',
              boxShadow: '0 0 12px #1890ff',
            }}
          />
        </div>
      </div>
    </div>
  );
};
