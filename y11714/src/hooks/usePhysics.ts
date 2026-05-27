import { useRef, useState, useCallback, useEffect } from 'react';
import { Ball } from '../physics/ball';
import { PhysicsEngine } from '../physics/engine';
import { Anomaly, BALL_RADIUS, PIXELS_PER_METER } from '../types';
import { saveExperimentResult, generateExperimentId } from '../utils/storage';
import { ExperimentResult, ExperimentParams } from '../types';

export interface UsePhysicsReturn {
  ball: Ball;
  engine: PhysicsEngine | null;
  isRunning: boolean;
  isPaused: boolean;
  bounceHeight: number;
  calculatedRestitution: number;
  anomalies: Anomaly[];
  hasAnomalies: boolean;
  initEngine: (canvasHeight: number, groundOffset: number) => void;
  startExperiment: () => void;
  pauseExperiment: () => void;
  resumeExperiment: () => void;
  resetExperiment: () => void;
  stepFrame: () => void;
  setBallPosition: (x: number, y: number) => void;
  setBallMass: (mass: number) => void;
  setRestitution: (restitution: number) => void;
  setTimeScale: (scale: number) => void;
  getTimeScale: () => number;
  getDropHeight: () => number;
  saveResult: (params: ExperimentParams) => ExperimentResult | null;
  forceUpdate: () => void;
}

export function usePhysics(initialX: number = 300): UsePhysicsReturn {
  const ballRef = useRef<Ball>(new Ball(initialX, 200, 1));
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [, forceRender] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bounceHeight, setBounceHeight] = useState(0);
  const [calculatedRestitution, setCalculatedRestitution] = useState(0);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [hasAnomalies, setHasAnomalies] = useState(false);

  const forceUpdate = useCallback(() => {
    forceRender({});
  }, []);

  const initEngine = useCallback((canvasHeight: number, groundOffset: number = 50) => {
    const groundY = canvasHeight - groundOffset;
    const engine = new PhysicsEngine(ballRef.current, groundY, 0.7);
    
    engine.setOnUpdate(() => {
      forceUpdate();
    });

    engine.setOnComplete(() => {
      setIsRunning(false);
      setIsPaused(false);
      setBounceHeight(engine.getBounceHeight());
      setCalculatedRestitution(engine.getCalculatedRestitution());
      setAnomalies(engine.getAnomalies());
      setHasAnomalies(engine.hasAnomalies());
      forceUpdate();
    });

    engineRef.current = engine;
    forceUpdate();
  }, [forceUpdate]);

  const startExperiment = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.start();
    setIsRunning(true);
    setIsPaused(false);
    setBounceHeight(0);
    setCalculatedRestitution(0);
    setAnomalies([]);
    setHasAnomalies(false);
  }, []);

  const pauseExperiment = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.pause();
    setIsPaused(true);
  }, []);

  const resumeExperiment = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resume();
    setIsPaused(false);
  }, []);

  const resetExperiment = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    setIsRunning(false);
    setIsPaused(false);
    setBounceHeight(0);
    setCalculatedRestitution(0);
    setAnomalies([]);
    setHasAnomalies(false);
    forceUpdate();
  }, [forceUpdate]);

  const stepFrame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stepFrame();
    forceUpdate();
  }, [forceUpdate]);

  const setBallPosition = useCallback((x: number, y: number) => {
    ballRef.current.x = x;
    ballRef.current.y = y;
    forceUpdate();
  }, [forceUpdate]);

  const setBallMass = useCallback((mass: number) => {
    ballRef.current.mass = mass;
  }, []);

  const setRestitution = useCallback((restitution: number) => {
    if (engineRef.current) {
      engineRef.current.setRestitution(restitution);
    }
  }, []);

  const setTimeScale = useCallback((scale: number) => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(scale);
    }
  }, []);

  const getTimeScale = useCallback(() => {
    return engineRef.current?.getTimeScale() || 1;
  }, []);

  const getDropHeight = useCallback(() => {
    if (!engineRef.current) return 0;
    return ballRef.current.getHeight(engineRef.current.getGroundY());
  }, []);

  const saveResult = useCallback((params: ExperimentParams): ExperimentResult | null => {
    if (!engineRef.current) return null;

    const result: ExperimentResult = {
      id: generateExperimentId(),
      timestamp: Date.now(),
      params,
      bounceHeight: engineRef.current.getBounceHeight(),
      calculatedRestitution: engineRef.current.getCalculatedRestitution(),
      anomalies: engineRef.current.getAnomalies().map((a) => a.message),
      isAnomaly: engineRef.current.hasAnomalies(),
    };

    saveExperimentResult(result);
    return result;
  }, []);

  return {
    ball: ballRef.current,
    engine: engineRef.current,
    isRunning,
    isPaused,
    bounceHeight,
    calculatedRestitution,
    anomalies,
    hasAnomalies,
    initEngine,
    startExperiment,
    pauseExperiment,
    resumeExperiment,
    resetExperiment,
    stepFrame,
    setBallPosition,
    setBallMass,
    setRestitution,
    setTimeScale,
    getTimeScale,
    getDropHeight,
    saveResult,
    forceUpdate,
  };
}
