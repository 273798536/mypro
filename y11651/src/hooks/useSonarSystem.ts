import { useCallback } from 'react';
import type { Point, ScanRecord, Cell } from '../types/game';
import { calculateEchoStrength, createScanRecord, updateGridWithScanResult, isTargetDetected } from '../utils/sonarUtils';
import { useGame } from '../store/gameContext';

export function useSonarSystem() {
  const { state, dispatch } = useGame();

  const scanCell = useCallback((position: Point): ScanRecord | null => {
    if (state.status !== 'playing' || state.cooldown > 0 || state.energy < state.scanCost) {
      return null;
    }

    const result = calculateEchoStrength(
      position,
      state.submarine.position,
      state.noiseSources
    );

    const detected = isTargetDetected(result.strength, result.noiseLevel);

    const scanRecord = createScanRecord(
      state.turn,
      position,
      result.strength,
      result.hasNoise,
      result.noiseLevel,
      detected
    );

    dispatch({ type: 'SCAN_CELL', payload: { position } });

    const newGrid = updateGridWithScanResult(
      state.grid,
      position,
      result.strength,
      result.hasNoise,
      result.noiseLevel
    );

    dispatch({
      type: 'UPDATE_COOLDOWN',
      payload: { value: state.cooldownTime }
    });

    return scanRecord;
  }, [state, dispatch]);

  const canScan = useCallback((): boolean => {
    return state.status === 'playing' && state.cooldown <= 0 && state.energy >= state.scanCost;
  }, [state.status, state.cooldown, state.energy, state.scanCost]);

  const getCellScanResult = useCallback((position: Point): Cell | undefined => {
    return state.grid[position.y]?.[position.x];
  }, [state.grid]);

  return {
    scanCell,
    canScan,
    getCellScanResult
  };
}
