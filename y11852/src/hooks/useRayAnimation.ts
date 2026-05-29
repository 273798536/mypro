import { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useDataStore } from '../store/useDataStore';
import { getPathUpToTime } from '../engine/geometry';
import type { SoundRay, Vec3 } from '../types/acoustics';

interface AnimatedRay {
  id: string;
  frequency: string;
  currentPath: Vec3[];
  targetPath: Vec3[];
  isActive: boolean;
  progress: number;
}

export const useRayAnimation = () => {
  const { soundRays, filters, activeFrequencyBand } = useDataStore();
  const { isPlaying, currentTime, speed, duration, totalFrames, setCurrentFrame, currentFrame } = usePlaybackStore();

  const animatedRaysRef = useRef<Map<string, AnimatedRay>>(new Map());
  const frameCountRef = useRef(0);

  useEffect(() => {
    animatedRaysRef.current.clear();
    soundRays.forEach((ray) => {
      animatedRaysRef.current.set(ray.id, {
        id: ray.id,
        frequency: ray.frequency,
        currentPath: [ray.path[0]],
        targetPath: ray.path,
        isActive: false,
        progress: 0,
      });
    });
  }, [soundRays]);

  const updateRayAnimation = useCallback((delta: number) => {
    if (!isPlaying) return;

    frameCountRef.current += 1;
    if (frameCountRef.current % 2 !== 0) return;

    const newFrame = currentFrame + Math.max(1, Math.round(speed * 2));
    if (newFrame >= totalFrames) {
      setCurrentFrame(0);
    } else {
      setCurrentFrame(newFrame);
    }
  }, [isPlaying, speed, currentFrame, totalFrames, setCurrentFrame]);

  const getVisibleRays = useCallback((): SoundRay[] => {
    return soundRays.filter((ray) => {
      if (!filters.frequencyBands.includes(ray.frequency as 'low' | 'mid' | 'high')) {
        return false;
      }
      if (filters.selectedSeatIds.length > 0) {
        const hitsSelected = ray.hitSeatIds.some((id) => filters.selectedSeatIds.includes(id));
        if (!hitsSelected) return false;
      }
      return true;
    });
  }, [soundRays, filters]);

  const getRayPathForCurrentTime = useCallback((ray: SoundRay): Vec3[] => {
    return getPathUpToTime(ray.path, ray.times, currentTime);
  }, [currentTime]);

  const getRayOpacity = useCallback((ray: SoundRay): number => {
    if (ray.times.length === 0) return 0;
    const startTime = ray.times[0];
    const endTime = ray.times[ray.times.length - 1];

    if (currentTime < startTime) return 0;
    if (currentTime > endTime + 0.5) return 0.1;

    const fadeIn = Math.min(1, (currentTime - startTime) / 0.1);
    const fadeOut = currentTime > endTime
      ? Math.max(0.1, 1 - (currentTime - endTime) / 0.5)
      : 1;

    return fadeIn * fadeOut * (ray.intensity[ray.intensity.length - 1] || 0.8);
  }, [currentTime]);

  const isRayActive = useCallback((ray: SoundRay): boolean => {
    if (ray.times.length === 0) return false;
    return currentTime >= ray.times[0] && currentTime <= ray.times[ray.times.length - 1];
  }, [currentTime]);

  const getCurrentRayHead = useCallback((ray: SoundRay): Vec3 | null => {
    if (ray.times.length === 0) return null;
    const path = getPathUpToTime(ray.path, ray.times, currentTime);
    return path.length > 0 ? path[path.length - 1] : null;
  }, [currentTime]);

  const getProgressPercentage = useCallback((): number => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  useFrame((_, delta) => {
    updateRayAnimation(delta);
  });

  return {
    getVisibleRays,
    getRayPathForCurrentTime,
    getRayOpacity,
    isRayActive,
    getCurrentRayHead,
    getProgressPercentage,
  };
};
