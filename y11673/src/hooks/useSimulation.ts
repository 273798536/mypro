import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SimulationParams,
  SimulationStatus,
  SimulationStats,
  IntegrationResult,
  SimulationError,
  DEFAULT_PARAMS,
  RayState,
} from '../types';
import { SchwarzschildMetric } from '../physics/Schwarzschild';
import { RayGenerator } from '../physics/RayGenerator';
import { errorHandler } from '../utils/errorHandler';

interface SimulationState {
  params: SimulationParams;
  status: SimulationStatus;
  results: IntegrationResult[];
  stats: SimulationStats;
  errors: SimulationError[];
  progress: number;
}

interface UseSimulationReturn {
  state: SimulationState;
  updateParams: (params: Partial<SimulationParams>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  clearResults: () => void;
  dismissError: (id: string) => void;
}

export const useSimulation = (): UseSimulationReturn => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [results, setResults] = useState<IntegrationResult[]>([]);
  const [stats, setStats] = useState<SimulationStats>({
    totalRays: 0,
    absorbedRays: 0,
    escapedRays: 0,
    errorRays: 0,
    averageSteps: 0,
    totalComputationTime: 0,
    fps: 60,
  });
  const [errors, setErrors] = useState<SimulationError[]>([]);
  const [progress, setProgress] = useState(0);

  const metricRef = useRef<SchwarzschildMetric | null>(null);
  const rayGeneratorRef = useRef<RayGenerator | null>(null);
  const simulationRef = useRef<{
    rays: RayState[];
    currentIndex: number;
    isPaused: boolean;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ lastTime: performance.now(), frames: 0 });

  const updateParams = useCallback((newParams: Partial<SimulationParams>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      const validationErrors = errorHandler.validateParams(updated);
      if (validationErrors.length > 0) {
        setErrors((prev) => [...validationErrors, ...prev].slice(0, 20));
      }
      return updated;
    });
  }, []);

  const initializeSimulation = useCallback(() => {
    metricRef.current = new SchwarzschildMetric(params.blackHoleMass);
    rayGeneratorRef.current = new RayGenerator(params);
    simulationRef.current = {
      rays: rayGeneratorRef.current.generateDefaultRays(),
      currentIndex: 0,
      isPaused: false,
    };

    setResults([]);
    setStats({
      totalRays: params.rayCount,
      absorbedRays: 0,
      escapedRays: 0,
      errorRays: 0,
      averageSteps: 0,
      totalComputationTime: 0,
      fps: 60,
    });
    setProgress(0);
    errorHandler.clearErrors();
    setErrors([]);
  }, [params]);

  const processRayBatch = useCallback(
    (batchSize: number = 5): boolean => {
      if (!metricRef.current || !simulationRef.current) return false;

      const { rays, isPaused } = simulationRef.current;
      if (isPaused) return true;

      const metric = metricRef.current;
      const startIndex = simulationRef.current.currentIndex;
      const endIndex = Math.min(startIndex + batchSize, rays.length);

      const newResults: IntegrationResult[] = [];
      let absorbed = 0;
      let escaped = 0;
      let error = 0;
      let totalSteps = 0;
      let totalTime = 0;

      for (let i = startIndex; i < endIndex; i++) {
        const result = metric.integrateRay(
          rays[i],
          params.integrationSteps,
          params.stepSize
        );
        result.id = i;

        newResults.push(result);
        totalSteps += result.totalSteps;
        totalTime += result.computationTime;

        if (result.status === 'absorbed') absorbed++;
        else if (result.status === 'escaped') escaped++;
        else if (result.status === 'error') {
          error++;
          const rayError = errorHandler.checkRayResult(result);
          if (rayError) {
            setErrors((prev) => [rayError, ...prev].slice(0, 20));
          }
        }
      }

      simulationRef.current.currentIndex = endIndex;

      setResults((prev) => [...prev, ...newResults]);
      setStats((prev) => ({
        ...prev,
        absorbedRays: prev.absorbedRays + absorbed,
        escapedRays: prev.escapedRays + escaped,
        errorRays: prev.errorRays + error,
        averageSteps:
          prev.averageSteps === 0
            ? totalSteps / newResults.length
            : (prev.averageSteps * prev.totalRays + totalSteps) /
              (prev.totalRays + newResults.length),
        totalComputationTime: prev.totalComputationTime + totalTime,
      }));
      setProgress(endIndex / rays.length);

      return endIndex < rays.length;
    },
    [params.integrationSteps, params.stepSize]
  );

  const runSimulation = useCallback(() => {
    const batchSize = 3;
    let hasMore = true;

    const process = () => {
      const now = performance.now();
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setStats((prev) => ({
          ...prev,
          fps: fpsCounterRef.current.frames,
        }));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      if (simulationRef.current?.isPaused) {
        animationFrameRef.current = requestAnimationFrame(process);
        return;
      }

      hasMore = processRayBatch(batchSize);

      if (hasMore) {
        animationFrameRef.current = requestAnimationFrame(process);
      } else {
        setStatus('completed');
      }
    };

    animationFrameRef.current = requestAnimationFrame(process);
  }, [processRayBatch]);

  const start = useCallback(() => {
    const validationErrors = errorHandler.validateParams(params);
    if (validationErrors.some((e) => e.severity === 'critical' && !e.recoverable)) {
      setErrors(validationErrors);
      return;
    }

    initializeSimulation();
    setStatus('running');
    runSimulation();
  }, [params, initializeSimulation, runSimulation]);

  const pause = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.isPaused = true;
      setStatus('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.isPaused = false;
      setStatus('running');
    }
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    simulationRef.current = null;
    metricRef.current = null;
    rayGeneratorRef.current = null;
    setStatus('idle');
    setResults([]);
    setProgress(0);
    setStats({
      totalRays: 0,
      absorbedRays: 0,
      escapedRays: 0,
      errorRays: 0,
      averageSteps: 0,
      totalComputationTime: 0,
      fps: 60,
    });
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setProgress(0);
    errorHandler.clearErrors();
    setErrors([]);
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    state: {
      params,
      status,
      results,
      stats,
      errors,
      progress,
    },
    updateParams,
    start,
    pause,
    resume,
    reset,
    clearResults,
    dismissError,
  };
};
