import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

export function usePlaybackAnimation() {
  const { isPlaying, playbackSpeed, currentTime, totalDuration, setCurrentTime } = useAppStore();
  const lastTimeRef = useRef<number>(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      const newTime = currentTime + delta * playbackSpeed;
      if (newTime >= totalDuration) {
        setCurrentTime(0);
      } else {
        setCurrentTime(newTime);
      }
    }
    lastTimeRef.current = currentTime;
  });

  return { isPlaying, currentTime };
}

export function useCameraAnimation() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    return () => {};
  }, []);

  return { cameraRef };
}
