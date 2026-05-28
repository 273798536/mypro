import { useEffect, useRef } from 'react';
import { useExperimentStore } from '../store/useExperimentStore';

const fixedDt = 1 / 60;
const maxSubSteps = 10;

export function PhysicsLoop() {
  const accumulatorRef = useRef(0);
  const intervalRef = useRef<number>();
  const lastTimeRef = useRef(0);

  useEffect(() => {
    console.log('[DEBUG] PhysicsLoop useEffect setup called');
    
    let frameCount = 0;
    let lastLogTime = 0;
    let isCancelled = false;

    const loop = () => {
      const time = performance.now();
      
      if (isCancelled) {
        console.log('[DEBUG] loop cancelled, returning');
        return;
      }
      
      frameCount++;
      
      const s = useExperimentStore.getState();
      const { isPlaying, isPaused, recordingMode, playbackSpeed, currentTime, duration } = s;
      const { physicsStep, recordFrame, setPlaying } = s;

      if (time - lastLogTime > 2000) {
        console.log('[DEBUG] loop running, frame:', frameCount, 'isPlaying:', isPlaying, 'currentTime:', currentTime.toFixed(2));
        lastLogTime = time;
      }

      if (!isPlaying || isPaused || recordingMode !== 'live') {
        accumulatorRef.current = 0;
        lastTimeRef.current = 0;
        return;
      }

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
      }
    };

    console.log('[DEBUG] PhysicsLoop: Starting setInterval');
    intervalRef.current = window.setInterval(loop, 1000 / 60);
    console.log('[DEBUG] PhysicsLoop: setInterval returned:', intervalRef.current);

    return () => {
      console.log('[DEBUG] PhysicsLoop useEffect cleanup called, cancelling interval:', intervalRef.current);
      isCancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <div style={{ display: 'none' }} />;
}
