import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const usePlayback = () => {
  const {
    isPlaying,
    playbackSpeed,
    currentTime,
    selectedTimeRange,
    angularVelocities,
    selectedFlywheelId,
    setCurrentTime,
    setIsPlaying,
  } = useAppStore();
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const flywheelVelocities = angularVelocities
    .filter(v => v.flywheelId === selectedFlywheelId)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const maxTime = selectedTimeRange 
    ? selectedTimeRange[1] 
    : (flywheelVelocities.length > 0 
        ? flywheelVelocities[flywheelVelocities.length - 1].timestamp 
        : 20);
  
  const minTime = selectedTimeRange ? selectedTimeRange[0] : 0;
  
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      setCurrentTime(prev => {
        const nextTime = prev + deltaTime * playbackSpeed;
        if (nextTime >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return nextTime;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, maxTime, setCurrentTime, setIsPlaying]);
  
  const play = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(minTime);
    }
    setIsPlaying(true);
  };
  
  const pause = () => {
    setIsPlaying(false);
  };
  
  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  const reset = () => {
    pause();
    setCurrentTime(minTime);
  };
  
  const seek = (time: number) => {
    const clampedTime = Math.max(minTime, Math.min(maxTime, time));
    setCurrentTime(clampedTime);
  };
  
  const getCurrentVelocity = () => {
    if (flywheelVelocities.length === 0) return null;
    
    let closest = flywheelVelocities[0];
    let minDiff = Math.abs(currentTime - closest.timestamp);
    
    for (const v of flywheelVelocities) {
      const diff = Math.abs(currentTime - v.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = v;
      }
    }
    
    return closest;
  };
  
  return {
    isPlaying,
    currentTime,
    minTime,
    maxTime,
    playbackSpeed,
    play,
    pause,
    togglePlay,
    reset,
    seek,
    getCurrentVelocity,
    flywheelVelocities,
  };
};
