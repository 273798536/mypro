import { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export function useAnimationLoop() {
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isRunning = useSimulationStore(state => state.isRunning);
  const speedMultiplier = useSimulationStore(state => state.speedMultiplier);
  const step = useSimulationStore(state => state.step);
  const timeStep = useSimulationStore(state => state.couplingParams.timeStep);

  const animate = useCallback((timestamp: number) => {
    if (!isRunning) {
      frameRef.current = 0;
      return;
    }

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    const simulationDelta = timeStep * speedMultiplier;
    const stepsPerFrame = Math.max(1, Math.floor(deltaTime / (simulationDelta * 1000)));
    const maxSteps = 10;
    const actualSteps = Math.min(stepsPerFrame, maxSteps);

    for (let i = 0; i < actualSteps; i++) {
      step();
    }

    lastTimeRef.current = timestamp;
    frameRef.current = requestAnimationFrame(animate);
  }, [isRunning, speedMultiplier, timeStep, step]);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = 0;
      frameRef.current = requestAnimationFrame(animate);
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning, animate]);

  return frameRef;
}
