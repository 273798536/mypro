import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { isMonsterInRange } from '../game/towers/modeTowerGenerator';

export function useGameLoop() {
  const gameState = useGameStore(state => state.gameState);
  const startWave = useGameStore(state => state.startWave);
  const spawnMonster = useGameStore(state => state.spawnMonster);
  const updateMonsterPosition = useGameStore(state => state.updateMonsterPosition);
  const setMonsterArrivalTime = useGameStore(state => state.setMonsterArrivalTime);
  const towerAttack = useGameStore(state => state.towerAttack);
  const captureReplayFrame = useGameStore(state => state.captureReplayFrame);
  const loseLife = useGameStore(state => state.loseLife);
  const removeMonster = useGameStore(state => state.removeMonster);

  const lastUpdateRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const currentMonsterIndexRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastAttackTimeRef = useRef<Record<string, number>>({});

  const gameLoop = useCallback((timestamp: number) => {
    const state = useGameStore.getState().gameState;
    if (!state || state.status !== 'playing') return;

    const deltaTime = timestamp - lastUpdateRef.current;
    lastUpdateRef.current = timestamp;

    if (state.wave === 0) {
      startWave();
      currentMonsterIndexRef.current = 0;
      spawnTimerRef.current = 0;
      return requestAnimationFrame(gameLoop);
    }

    const waveConfig = state.level?.waves[state.wave - 1];
    if (!waveConfig) return;

    spawnTimerRef.current += deltaTime;
    if (currentMonsterIndexRef.current < waveConfig.monsters && 
        spawnTimerRef.current >= waveConfig.interval) {
      const key = waveConfig.keys[currentMonsterIndexRef.current % waveConfig.keys.length];
      spawnMonster(key);
      currentMonsterIndexRef.current++;
      spawnTimerRef.current = 0;
    }

    state.monsters.forEach(monster => {
      if (!state.level) return;

      const path = state.level.path;
      const nextIndex = monster.pathIndex + 1;
      
      if (nextIndex >= path.length) {
        if (!monster.arrivalTime) {
          setMonsterArrivalTime(monster.id, timestamp);
          loseLife();
          removeMonster(monster.id);
        }
        return;
      }

      const currentPos = monster.position;
      const targetPos = path[nextIndex];
      
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const moveSpeed = monster.speed * (deltaTime / 1000);
      
      if (distance <= moveSpeed) {
        updateMonsterPosition(monster.id, targetPos, nextIndex);
      } else {
        const ratio = moveSpeed / distance;
        const newPos = {
          x: currentPos.x + dx * ratio,
          y: currentPos.y + dy * ratio
        };
        updateMonsterPosition(monster.id, newPos, monster.pathIndex);
      }
    });

    state.towers.forEach(tower => {
      if (!tower.position || !state.level) return;

      const lastAttack = lastAttackTimeRef.current[tower.id] || 0;
      if (timestamp - lastAttack < tower.attackSpeed) return;

      const monstersInRange = state.monsters.filter(m => 
        isMonsterInRange(tower, m.position)
      );

      if (monstersInRange.length > 0) {
        const target = monstersInRange.reduce((closest, m) => 
          m.pathIndex > closest.pathIndex ? m : closest
        );

        const monsterArrivalTime = state.monsters.find(m => m.id === target.id)?.arrivalTime;
        const isLate = monsterArrivalTime ? timestamp > monsterArrivalTime + 1000 : false;

        towerAttack(tower.id, target.id, isLate);
        lastAttackTimeRef.current[tower.id] = timestamp;
      }
    });

    frameCountRef.current++;
    if (frameCountRef.current % 30 === 0) {
      captureReplayFrame();
    }

    if (currentMonsterIndexRef.current >= waveConfig.monsters && 
        state.monsters.length === 0) {
      if (state.wave < state.totalWaves) {
        setTimeout(() => {
          startWave();
          currentMonsterIndexRef.current = 0;
          spawnTimerRef.current = 0;
        }, 2000);
        return;
      }
    }

    requestAnimationFrame(gameLoop);
  }, [startWave, spawnMonster, updateMonsterPosition, setMonsterArrivalTime, towerAttack, captureReplayFrame, loseLife, removeMonster]);

  useEffect(() => {
    if (gameState?.status === 'playing') {
      lastUpdateRef.current = performance.now();
      const frameId = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(frameId);
    }
  }, [gameState?.status, gameLoop]);

  useEffect(() => {
    return () => {
      lastAttackTimeRef.current = {};
      frameCountRef.current = 0;
    };
  }, []);
}
