import { useEffect, useRef } from 'react';
import { useExperimentStore } from '../store/useExperimentStore';

export function usePhysicsLoop() {
  const isPlaying = useExperimentStore((state) => state.isPlaying);
  const isPaused = useExperimentStore((state) => state.isPaused);
  const playbackSpeed = useExperimentStore((state) => state.playbackSpeed);
  const physicsStep = useExperimentStore((state) => state.physicsStep);
  const recordFrame = useExperimentStore((state) => state.recordFrame);
  const currentTime = useExperimentStore((state) => state.currentTime);
  const duration = useExperimentStore((state) => state.duration);
  const setPlaying = useExperimentStore((state) => state.setPlaying);
  const recordingMode = useExperimentStore((state) => state.recordingMode);

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || isPaused || recordingMode !== 'live') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const fixedDt = 1 / 60;
    const maxSubSteps = 10;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const frameTime = Math.min((time - lastTimeRef.current) / 1000, 0.1) * playbackSpeed;
      lastTimeRef.current = time;

      accumulatorRef.current += frameTime;

      let subSteps = 0;
      while (accumulatorRef.current >= fixedDt && subSteps < maxSubSteps) {
        physicsStep(fixedDt);
        accumulatorRef.current -= fixedDt;
        subSteps++;
      }

      recordFrame();

      if (currentTime >= duration) {
        setPlaying(false);
        return;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused, playbackSpeed, physicsStep, recordFrame, currentTime, duration, setPlaying, recordingMode]);

  return null;
}
