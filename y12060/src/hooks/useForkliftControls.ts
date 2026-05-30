import { useState, useEffect, useCallback, useRef } from 'react';
import { InputState, PhysicsState, updatePhysics, PhysicsConfig } from '../utils/physics';
import { Forklift } from '../types/forklift';
import { DIFFICULTY_CONFIG } from '../config/levels';
import { Difficulty } from '../types/game';

const initialInput: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  liftUp: false,
  liftDown: false
};

const initialPhysicsState: PhysicsState = {
  position: { x: 0, y: 0, z: 10 },
  rotation: 0,
  speed: 0,
  steeringAngle: 0
};

export function useForkliftControls(forklift: Forklift | null, difficulty: Difficulty, isPlaying: boolean) {
  const [input, setInput] = useState<InputState>(initialInput);
  const [physicsState, setPhysicsState] = useState<PhysicsState>(initialPhysicsState);
  const [forkHeight, setForkHeight] = useState(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  const getPhysicsConfig = useCallback((): Partial<PhysicsConfig> => {
    if (!forklift) return {};
    const diffConfig = DIFFICULTY_CONFIG[difficulty];
    return {
      maxSpeed: diffConfig.speedLimit / 3.6,
      turnRadius: forklift.turnRadius,
      wheelBase: forklift.length * 0.6
    };
  }, [forklift, difficulty]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlaying) return;
    
    const key = e.key.toLowerCase();
    setInput(prev => {
      if (key === 'w' || key === 'arrowup') return { ...prev, forward: true };
      if (key === 's' || key === 'arrowdown') return { ...prev, backward: true };
      if (key === 'a' || key === 'arrowleft') return { ...prev, left: true };
      if (key === 'd' || key === 'arrowright') return { ...prev, right: true };
      if (key === 'q') return { ...prev, liftUp: true };
      if (key === 'e') return { ...prev, liftDown: true };
      return prev;
    });
  }, [isPlaying]);
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    setInput(prev => {
      if (key === 'w' || key === 'arrowup') return { ...prev, forward: false };
      if (key === 's' || key === 'arrowdown') return { ...prev, backward: false };
      if (key === 'a' || key === 'arrowleft') return { ...prev, left: false };
      if (key === 'd' || key === 'arrowright') return { ...prev, right: false };
      if (key === 'q') return { ...prev, liftUp: false };
      if (key === 'e') return { ...prev, liftDown: false };
      return prev;
    });
  }, []);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }
    
    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      const config = getPhysicsConfig();
      const result = updatePhysics(
        physicsState,
        input,
        forkHeight,
        deltaTime,
        config
      );
      
      setPhysicsState({
        position: result.position,
        rotation: result.rotation,
        speed: result.speed,
        steeringAngle: result.steeringAngle
      });
      setForkHeight(result.forkHeight);
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, input, physicsState, forkHeight, getPhysicsConfig]);
  
  const resetPosition = useCallback(() => {
    setPhysicsState(initialPhysicsState);
    setForkHeight(0);
    setInput(initialInput);
    lastTimeRef.current = 0;
  }, []);
  
  const setPosition = useCallback((position: { x: number; y: number; z: number }, rotation: number, height: number) => {
    setPhysicsState(prev => ({
      ...prev,
      position,
      rotation
    }));
    setForkHeight(height);
  }, []);
  
  return {
    position: physicsState.position,
    rotation: physicsState.rotation,
    speed: physicsState.speed,
    steeringAngle: physicsState.steeringAngle,
    forkHeight,
    input,
    resetPosition,
    setPosition
  };
}
