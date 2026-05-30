import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { PHYSICS_CONSTANTS } from '@/utils/constants';
import { Particle, OreBlock, GameFrame } from '@/utils/types';
import { checkAllCollisions, resolveBoundaryCollision } from '@/utils/physics/collision';
import { validateAndRecordCollision } from '@/utils/physics/validator';
import { calculateElasticCollision2D } from '@/utils/physics/momentum';

export function useGameLoop() {
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const processedCollisionsRef = useRef<Set<string>>(new Set());
  
  const gameStatus = useGameStore((state) => state.status);
  const isReplaying = useUIStore((state) => state.isReplaying);
  
  const updateParticles = useGameStore((state) => state.updateParticles);
  const updateOreBlocks = useGameStore((state) => state.updateOreBlocks);
  const addCollisionRecord = useGameStore((state) => state.addCollisionRecord);
  const addError = useGameStore((state) => state.addError);
  const updateScore = useGameStore((state) => state.updateScore);
  const addFrame = useGameStore((state) => state.addFrame);
  const setCurrentFrame = useGameStore((state) => state.setCurrentFrame);
  const setStatus = useGameStore((state) => state.setStatus);
  const clearAllErrors = useGameStore((state) => state.clearAllErrors);
  
  const particles = useGameStore((state) => state.particles);
  const oreBlocks = useGameStore((state) => state.oreBlocks);
  const canvasWidth = useGameStore((state) => state.canvasWidth);
  const canvasHeight = useGameStore((state) => state.canvasHeight);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameStatus !== 'playing' || isReplaying) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    const deltaTime = timestamp - lastTimeRef.current;
    if (deltaTime < 1000 / PHYSICS_CONSTANTS.FRAME_RATE) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    lastTimeRef.current = timestamp;
    frameCountRef.current++;
    const currentFrameIndex = frameCountRef.current;
    
    const dt = 1 / PHYSICS_CONSTANTS.FRAME_RATE;
    
    let updatedParticles = particles.map((p) => {
      if (!p.active) return p;
      
      const newX = p.x + p.vx * dt * 60;
      const newY = p.y + p.vy * dt * 60;
      
      const newTrail = [...p.trail, { x: p.x, y: p.y }];
      if (newTrail.length > PHYSICS_CONSTANTS.MAX_TRAIL_LENGTH) {
        newTrail.shift();
      }
      
      return {
        ...p,
        x: newX,
        y: newY,
        trail: newTrail,
      };
    });
    
    let updatedOres = [...oreBlocks];
    
    const { particleOreCollisions, boundaryCollisions } = checkAllCollisions(
      updatedParticles,
      updatedOres,
      canvasWidth,
      canvasHeight
    );
    
    for (const { particle, ore, point } of particleOreCollisions) {
      const collisionKey = `${particle.id}-${ore.id}-${currentFrameIndex}`;
      if (processedCollisionsRef.current.has(collisionKey)) continue;
      processedCollisionsRef.current.add(collisionKey);
      
      const validation = validateAndRecordCollision(particle, ore, point, currentFrameIndex);
      
      addCollisionRecord(validation.collisionRecord);
      updateScore(validation.scoreChange);
      
      for (const err of validation.errors) {
        addError(err);
      }
      
      const collisionResult = calculateElasticCollision2D(
        { x: particle.x, y: particle.y, vx: particle.vx, vy: particle.vy, mass: particle.type.mass },
        { x: ore.x + ore.width / 2, y: ore.y + ore.height / 2, vx: ore.vx, vy: ore.vy, mass: ore.type.mass },
        PHYSICS_CONSTANTS.ELASTIC_COEFFICIENT
      );
      
      updatedParticles = updatedParticles.map((p) =>
        p.id === particle.id
          ? { ...p, vx: collisionResult.particleVx, vy: collisionResult.particleVy, active: false }
          : p
      );
      
      if (validation.oreCollected) {
        updatedOres = updatedOres.map((o) =>
          o.id === ore.id ? { ...o, collected: true, health: 0 } : o
        );
      } else {
        updatedOres = updatedOres.map((o) =>
          o.id === ore.id
            ? { ...o, vx: collisionResult.oreVx, vy: collisionResult.oreVy, health: Math.max(0, o.health - 10) }
            : o
        );
      }
    }
    
    for (const { particle, side } of boundaryCollisions) {
      updatedParticles = updatedParticles.map((p) =>
        p.id === particle.id
          ? resolveBoundaryCollision(p, side, PHYSICS_CONSTANTS.ELASTIC_COEFFICIENT)
          : p
      );
    }
    
    const allInactive = updatedParticles.every((p) => !p.active);
    
    updateParticles(updatedParticles);
    updateOreBlocks(updatedOres);
    setCurrentFrame(currentFrameIndex);
    
    const frame: GameFrame = {
      frameIndex: currentFrameIndex,
      particles: JSON.parse(JSON.stringify(updatedParticles)),
      oreBlocks: JSON.parse(JSON.stringify(updatedOres)),
      timestamp,
    };
    addFrame(frame);
    
    if (allInactive && updatedParticles.length > 0) {
      const allOresCollected = updatedOres.every((o) => o.collected);
      const state = useGameStore.getState();
      const remaining = state.maxEnergy - state.energyUsed;
      const noEnergy = remaining <= 10;
      
      if (allOresCollected || noEnergy) {
        setStatus('finished');
        useUIStore.getState().setShowResultModal(true);
      } else {
        setStatus('idle');
        clearAllErrors();
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameStatus, isReplaying, particles, oreBlocks, canvasWidth, canvasHeight, 
      updateParticles, updateOreBlocks, addCollisionRecord, addError, updateScore, 
      addFrame, setCurrentFrame, setStatus, clearAllErrors]);

  useEffect(() => {
    if (gameStatus === 'playing' && !isReplaying) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStatus, isReplaying, gameLoop]);

  useEffect(() => {
    if (gameStatus === 'idle') {
      processedCollisionsRef.current.clear();
    }
  }, [gameStatus]);

  return {
    isRunning: gameStatus === 'playing' && !isReplaying,
  };
}
