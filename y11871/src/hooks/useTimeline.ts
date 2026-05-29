import { useEffect, useRef, useCallback } from 'react';
import { useParkingStore } from '../store/useParkingStore';

export const useTimeline = () => {
  const { 
    timeline, 
    records, 
    setCurrentHour, 
    setIsPlaying,
    setPlaybackSpeed,
    togglePlay,
    resetTimeline,
  } = useParkingStore();
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const delta = timestamp - lastTimeRef.current;
    const speed = timeline.playbackSpeed;
    const hoursPerSecond = 2 * speed;
    const deltaHours = (delta / 1000) * hoursPerSecond;

    const currentState = useParkingStore.getState();
    let nextHour = currentState.timeline.currentHour + deltaHours;
    
    if (nextHour >= 24) {
      nextHour = 0;
    }

    setCurrentHour(nextHour);
    lastTimeRef.current = timestamp;
    animationRef.current = requestAnimationFrame(tick);
  }, [timeline.playbackSpeed, setCurrentHour]);

  useEffect(() => {
    if (timeline.isPlaying && records.length > 0) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(tick);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [timeline.isPlaying, records.length, tick]);

  return {
    currentHour: timeline.currentHour,
    isPlaying: timeline.isPlaying,
    playbackSpeed: timeline.playbackSpeed,
    minHour: timeline.minHour,
    maxHour: timeline.maxHour,
    setCurrentHour,
    setIsPlaying,
    setPlaybackSpeed,
    togglePlay,
    resetTimeline,
  };
};
