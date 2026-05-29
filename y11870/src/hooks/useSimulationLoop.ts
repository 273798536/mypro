import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import {
  calculateWaveStep,
  createWaveGrid,
  detectPhaseOutOfBounds,
  detectWavePenetration,
  detectSamplingStutter,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '../utils/wavePhysics';

export function useSimulationLoop() {
  const isPlaying = useSimulationStore((state) => state.simulation.isPlaying);
  const speed = useSimulationStore((state) => state.simulation.speed);
  const sources = useSimulationStore((state) => state.sources);
  const obstacles = useSimulationStore((state) => state.obstacles);

  const setWaveData = useSimulationStore((state) => state.setWaveData);
  const setTime = useSimulationStore((state) => state.setTime);
  const addWarning = useSimulationStore((state) => state.addWarning);

  const currentGridRef = useRef<Float32Array | null>(null);
  const prevGridRef = useRef<Float32Array | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const frameStartRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const timeRef = useRef<number>(0);
  const speedRef = useRef<number>(1);
  const sourcesRef = useRef(sources);
  const obstaclesRef = useRef(obstacles);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    if (!currentGridRef.current) {
      currentGridRef.current = createWaveGrid(GRID_WIDTH, GRID_HEIGHT);
      prevGridRef.current = createWaveGrid(GRID_WIDTH, GRID_HEIGHT);
    }
  }, []);

  useEffect(() => {
    const phaseWarnings = detectPhaseOutOfBounds(sources);
    phaseWarnings.forEach((w) => {
      addWarning({
        type: w.type,
        severity: w.severity,
        message: w.message,
        location: w.location,
      });
    });
  }, [sources, addWarning]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      frameStartRef.current = performance.now();

      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      timeRef.current += deltaTime * speedRef.current;
      setTime(timeRef.current);

      if (currentGridRef.current && prevGridRef.current) {
        const nextGrid = calculateWaveStep(
          sourcesRef.current,
          obstaclesRef.current,
          timeRef.current,
          currentGridRef.current,
          prevGridRef.current,
          GRID_WIDTH,
          GRID_HEIGHT
        );

        prevGridRef.current = currentGridRef.current;
        currentGridRef.current = nextGrid;
        setWaveData(nextGrid);

        if (obstaclesRef.current.length > 0) {
          const penetrationWarnings = detectWavePenetration(
            nextGrid,
            obstaclesRef.current,
            GRID_WIDTH,
            GRID_HEIGHT
          );
          penetrationWarnings.forEach((w) => {
            addWarning({
              type: w.type,
              severity: w.severity,
              message: w.message,
              location: w.location,
            });
          });
        }
      }

      const frameDuration = performance.now() - frameStartRef.current;
      frameTimesRef.current = [...frameTimesRef.current.slice(-20), frameDuration];

      const stutterWarning = detectSamplingStutter(frameTimesRef.current);
      if (stutterWarning) {
        addWarning({
          type: stutterWarning.type,
          severity: stutterWarning.severity,
          message: stutterWarning.message,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, setWaveData, setTime, addWarning]);

  return null;
}
