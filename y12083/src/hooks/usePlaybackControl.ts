import { useEffect, useRef } from 'react';
import { useAttitudeStore } from '../store/useAttitudeStore';

export const usePlaybackControl = () => {
  const isPlaying = useAttitudeStore((s) => s.playbackState.isPlaying);
  const speed = useAttitudeStore((s) => s.playbackState.speed);
  const totalFrames = useAttitudeStore((s) => s.validatedFrames.length);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);

  useEffect(() => {
    if (!isPlaying || totalFrames === 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      return;
    }

    const frameInterval = 1000 / 30 / speed;

    const tick = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatorRef.current += dt;

      while (accumulatorRef.current >= frameInterval) {
        const s = useAttitudeStore.getState();
        const nextIdx = s.playbackState.currentFrame + 1;
        if (nextIdx >= s.validatedFrames.length) {
          s.setPlaybackState({ isPlaying: false, currentFrame: 0 });
          s.goToFrame(0);
          accumulatorRef.current = 0;
          lastTimeRef.current = 0;
          return;
        }
        s.nextFrame();
        accumulatorRef.current -= frameInterval;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, totalFrames]);
};
