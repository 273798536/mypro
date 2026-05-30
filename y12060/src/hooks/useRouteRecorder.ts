import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { RoutePoint } from '../types/game';

interface UseRouteRecorderProps {
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  forkHeight: number;
  isPlaying: boolean;
  isPaused: boolean;
}

export function useRouteRecorder({
  position,
  rotation,
  speed,
  forkHeight,
  isPlaying,
  isPaused
}: UseRouteRecorderProps) {
  const addRoutePoint = useGameStore(state => state.addRoutePoint);
  const startTime = useGameStore(state => state.session.startTime);
  const totalPauseDuration = useGameStore(state => state.session.totalPauseDuration);
  
  const lastRecordTimeRef = useRef<number>(0);
  const recordInterval = 100;
  
  useEffect(() => {
    if (!isPlaying || isPaused || !startTime) return;
    
    const now = Date.now();
    if (now - lastRecordTimeRef.current < recordInterval) return;
    
    const elapsed = now - startTime - totalPauseDuration;
    
    const routePoint: RoutePoint = {
      timestamp: elapsed,
      position: { ...position },
      rotation,
      speed,
      forkHeight
    };
    
    addRoutePoint(routePoint);
    lastRecordTimeRef.current = now;
  }, [position, rotation, speed, forkHeight, isPlaying, isPaused, startTime, totalPauseDuration, addRoutePoint]);
  
  return null;
}
