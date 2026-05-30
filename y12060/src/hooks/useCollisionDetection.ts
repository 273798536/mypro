import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { Shelf } from '../types/shelf';
import { Forklift } from '../types/forklift';
import {
  getForkliftAABB,
  checkShelfCollision,
  checkBlindZone,
  checkOverHeight,
  getCollisionSpeedSeverity,
  getBlindZoneSeverity
} from '../utils/collision';
import { getSpeedKmh } from '../utils/physics';
import { CollisionType, Severity } from '../types/game';

interface UseCollisionDetectionProps {
  position: { x: number; y: number; z: number };
  speed: number;
  forkHeight: number;
  forklift: Forklift | null;
  shelves: Shelf[];
  isPlaying: boolean;
}

export function useCollisionDetection({
  position,
  speed,
  forkHeight,
  forklift,
  shelves,
  isPlaying
}: UseCollisionDetectionProps) {
  const addViolation = useGameStore(state => state.addViolation);
  const isInBlindZone = useGameStore(state => state.isInBlindZone);
  const blindZoneStartTime = useGameStore(state => state.blindZoneStartTime);
  const setInBlindZone = useGameStore(state => state.setInBlindZone);
  const setWarningMessage = useGameStore(state => state.setWarningMessage);
  
  const lastShelfCollisionRef = useRef<number>(0);
  const lastOverHeightRef = useRef<number>(0);
  const lastBlindZoneRef = useRef<number>(0);
  
  const allBlindZones = shelves.flatMap(s => s.blindZones.map(bz => ({
    ...bz,
    shelfId: s.id,
    shelfName: s.name
  })));
  
  const maxShelfHeight = shelves.length > 0 ? Math.max(...shelves.map(s => s.height)) : 5;
  
  const detectCollisions = useCallback(() => {
    if (!isPlaying || !forklift) return;
    
    const now = Date.now();
    const speedKmh = getSpeedKmh(speed);
    
    const forkliftAABB = getForkliftAABB(
      position,
      forklift.length,
      forklift.width,
      forkHeight
    );
    
    const shelfResult = checkShelfCollision(forkliftAABB, shelves);
    if (shelfResult.collided && shelfResult.shelf && now - lastShelfCollisionRef.current > 1000) {
      const speedSeverity = getCollisionSpeedSeverity(speedKmh);
      const severity: Severity = 
        speedSeverity === 'severe' || shelfResult.severity === 'severe' ? 'severe' :
        speedSeverity === 'moderate' || shelfResult.severity === 'moderate' ? 'moderate' : 'minor';
      
      addViolation({
        type: 'shelf' as CollisionType,
        timestamp: now,
        position: { ...position },
        speed: speedKmh,
        angle: speedKmh,
        objectId: shelfResult.shelf.id,
        objectName: shelfResult.shelf.name,
        severity
      });
      
      lastShelfCollisionRef.current = now;
      
      setTimeout(() => {
        useGameStore.setState({ showCollisionEffect: false, warningMessage: null });
      }, 1500);
    }
    
    const overHeightResult = checkOverHeight(forkHeight, maxShelfHeight, 1.0);
    if (overHeightResult.isOver && now - lastOverHeightRef.current > 1500) {
      addViolation({
        type: 'overheight' as CollisionType,
        timestamp: now,
        position: { ...position },
        speed: speedKmh,
        angle: 0,
        objectId: 'overheight',
        objectName: `超高 ${overHeightResult.overAmount?.toFixed(2)}m`,
        severity: overHeightResult.severity || 'minor'
      });
      
      lastOverHeightRef.current = now;
      
      setTimeout(() => {
        setWarningMessage(null);
      }, 1500);
    }
    
    const blindZoneResult = checkBlindZone(position, allBlindZones);
    
    if (blindZoneResult.inZone && !isInBlindZone) {
      setInBlindZone(true);
      setWarningMessage('⚠️ 进入盲区，请减速并注意观察');
    } else if (!blindZoneResult.inZone && isInBlindZone) {
      const duration = now - blindZoneStartTime;
      
      if (duration > 1000 && now - lastBlindZoneRef.current > 2000) {
        const severity = getBlindZoneSeverity(duration);
        addViolation({
          type: 'blindzone' as CollisionType,
          timestamp: now,
          position: { ...position },
          speed: speedKmh,
          angle: 0,
          objectId: blindZoneResult.zone ? `blindzone-${blindZoneResult.zone.x}-${blindZoneResult.zone.z}` : 'blindzone',
          objectName: `盲区长时间穿行 ${(duration / 1000).toFixed(1)}秒`,
          severity
        });
        
        lastBlindZoneRef.current = now;
      }
      
      setInBlindZone(false);
      setWarningMessage(null);
    }
  }, [isPlaying, forklift, position, speed, forkHeight, shelves, maxShelfHeight, allBlindZones, isInBlindZone, blindZoneStartTime, addViolation, setInBlindZone, setWarningMessage]);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(detectCollisions, 50);
    return () => clearInterval(interval);
  }, [isPlaying, detectCollisions]);
  
  return {
    detectCollisions
  };
}
