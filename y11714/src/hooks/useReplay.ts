import { useState, useRef, useCallback, useEffect } from 'react';
import { FrameData } from '../types';

export interface UseReplayOptions {
  frames: FrameData[];
  onReplayFrame?: (frame: FrameData) => void;
  onReplayComplete?: () => void;
  fps?: number;
}

export interface UseReplayReturn {
  isReplaying: boolean;
  replayProgress: number;
  currentFrameIndex: number;
  startReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
  stopReplay: () => void;
  seekToFrame: (frameIndex: number) => void;
  setReplaySpeed: (speed: number) => void;
}

export function useReplay(options: UseReplayOptions): UseReplayReturn {
  const { frames, onReplayFrame, onReplayComplete, fps = 60 } = options;
  
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const frameAccumulatorRef = useRef<number>(0);

  const replayProgress = frames.length > 0 
    ? (currentFrameIndex / frames.length) * 100 
    : 0;

  const playFrame = useCallback((index: number) => {
    if (index >= 0 && index < frames.length) {
      const frame = frames[index];
      setCurrentFrameIndex(index);
      if (onReplayFrame) {
        onReplayFrame(frame);
      }
    }
  }, [frames, onReplayFrame]);

  const startReplay = useCallback(() => {
    if (frames.length === 0) return;
    
    setCurrentFrameIndex(0);
    setIsReplaying(true);
    setIsPaused(false);
    frameAccumulatorRef.current = 0;
    lastTimestampRef.current = performance.now();
    
    playFrame(0);
  }, [frames.length, playFrame]);

  const pauseReplay = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeReplay = useCallback(() => {
    setIsPaused(false);
    lastTimestampRef.current = performance.now();
  }, []);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setIsPaused(false);
    setCurrentFrameIndex(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (onReplayComplete) {
      onReplayComplete();
    }
  }, [onReplayComplete]);

  const seekToFrame = useCallback((frameIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(frames.length - 1, frameIndex));
    setCurrentFrameIndex(clampedIndex);
    playFrame(clampedIndex);
  }, [frames.length, playFrame]);

  useEffect(() => {
    if (!isReplaying || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / fps;

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      
      frameAccumulatorRef.current += deltaTime * replaySpeed;
      
      let nextFrameIndex = currentFrameIndex;
      
      while (frameAccumulatorRef.current >= frameInterval && nextFrameIndex < frames.length - 1) {
        frameAccumulatorRef.current -= frameInterval;
        nextFrameIndex++;
      }

      if (nextFrameIndex !== currentFrameIndex) {
        setCurrentFrameIndex(nextFrameIndex);
        playFrame(nextFrameIndex);
      }

      if (nextFrameIndex >= frames.length - 1) {
        setIsReplaying(false);
        if (onReplayComplete) {
          onReplayComplete();
        }
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isReplaying, isPaused, currentFrameIndex, frames, fps, replaySpeed, playFrame, onReplayComplete]);

  return {
    isReplaying,
    replayProgress,
    currentFrameIndex,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    seekToFrame,
    setReplaySpeed,
  };
}
