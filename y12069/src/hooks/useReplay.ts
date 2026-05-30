import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore, useFrameHistory } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { GameFrame } from '@/utils/types';

export function useReplay() {
  const frameHistory = useFrameHistory();
  const [replayFrameIndex, setReplayFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const updateParticles = useGameStore((state) => state.updateParticles);
  const updateOreBlocks = useGameStore((state) => state.updateOreBlocks);
  const setIsReplaying = useUIStore((state) => state.setIsReplaying);
  const setStatus = useGameStore((state) => state.setStatus);
  const originalStatus = useGameStore((state) => state.status);
  
  const startReplay = useCallback(() => {
    if (frameHistory.length === 0) return;
    
    setIsReplaying(true);
    setStatus('paused');
    setReplayFrameIndex(0);
    setIsPlaying(false);
  }, [frameHistory.length, setIsReplaying, setStatus]);
  
  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setIsPlaying(false);
    if (originalStatus === 'playing') {
      setStatus('playing');
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [setIsReplaying, setStatus, originalStatus]);
  
  const goToFrame = useCallback((frameIndex: number) => {
    if (frameIndex < 0 || frameIndex >= frameHistory.length) return;
    
    const frame: GameFrame = frameHistory[frameIndex];
    updateParticles(JSON.parse(JSON.stringify(frame.particles)));
    updateOreBlocks(JSON.parse(JSON.stringify(frame.oreBlocks)));
    setReplayFrameIndex(frameIndex);
  }, [frameHistory, updateParticles, updateOreBlocks]);
  
  const playReplay = useCallback(() => {
    if (frameHistory.length === 0) return;
    setIsPlaying(true);
  }, [frameHistory.length]);
  
  const pauseReplay = useCallback(() => {
    setIsPlaying(false);
  }, []);
  
  const stepForward = useCallback(() => {
    if (replayFrameIndex < frameHistory.length - 1) {
      goToFrame(replayFrameIndex + 1);
    }
  }, [replayFrameIndex, frameHistory.length, goToFrame]);
  
  const stepBackward = useCallback(() => {
    if (replayFrameIndex > 0) {
      goToFrame(replayFrameIndex - 1);
    }
  }, [replayFrameIndex, goToFrame]);
  
  const goToStart = useCallback(() => {
    goToFrame(0);
  }, [goToFrame]);
  
  const goToEnd = useCallback(() => {
    if (frameHistory.length > 0) {
      goToFrame(frameHistory.length - 1);
    }
  }, [frameHistory.length, goToFrame]);
  
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      const frameInterval = 1000 / (60 * replaySpeed);
      
      if (deltaTime >= frameInterval) {
        lastTimeRef.current = timestamp;
        
        if (replayFrameIndex < frameHistory.length - 1) {
          goToFrame(replayFrameIndex + 1);
        } else {
          setIsPlaying(false);
          return;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, replayFrameIndex, frameHistory.length, replaySpeed, goToFrame]);
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return {
    isReplayMode: useUIStore.getState().isReplaying,
    isPlaying,
    replayFrameIndex,
    totalFrames: frameHistory.length,
    replaySpeed,
    startReplay,
    stopReplay,
    playReplay,
    pauseReplay,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
    goToFrame,
    setReplaySpeed,
    hasFrames: frameHistory.length > 0,
  };
}
