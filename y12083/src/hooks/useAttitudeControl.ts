import { useCallback } from 'react';
import { EulerAngles } from '../types';
import { useAttitudeStore } from '../store/useAttitudeStore';
import { normalizeAngle } from '../utils/math';

export const useAttitudeControl = () => {
  const { currentAngles, setCurrentAngles, resetToDefault } = useAttitudeStore();

  const setPitch = useCallback((value: number) => {
    setCurrentAngles({ pitch: normalizeAngle(value) });
  }, [setCurrentAngles]);

  const setYaw = useCallback((value: number) => {
    setCurrentAngles({ yaw: normalizeAngle(value) });
  }, [setCurrentAngles]);

  const setRoll = useCallback((value: number) => {
    setCurrentAngles({ roll: normalizeAngle(value) });
  }, [setCurrentAngles]);

  const setAllAngles = useCallback((angles: Partial<EulerAngles>) => {
    const normalized: Partial<EulerAngles> = {};
    if (angles.pitch !== undefined) normalized.pitch = normalizeAngle(angles.pitch);
    if (angles.yaw !== undefined) normalized.yaw = normalizeAngle(angles.yaw);
    if (angles.roll !== undefined) normalized.roll = normalizeAngle(angles.roll);
    setCurrentAngles(normalized);
  }, [setCurrentAngles]);

  const resetAngles = useCallback(() => {
    resetToDefault();
  }, [resetToDefault]);

  const incrementAngle = useCallback((axis: 'pitch' | 'yaw' | 'roll', delta: number) => {
    const currentValue = currentAngles[axis];
    setCurrentAngles({ [axis]: normalizeAngle(currentValue + delta) });
  }, [currentAngles, setCurrentAngles]);

  return {
    currentAngles,
    setPitch,
    setYaw,
    setRoll,
    setAllAngles,
    resetAngles,
    incrementAngle,
  };
};
