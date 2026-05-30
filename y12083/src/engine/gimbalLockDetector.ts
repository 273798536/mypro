import { GimbalLockState, EulerAngles } from '../types';
import { GIMBAL_LOCK_THRESHOLD, GIMBAL_LOCK_UPPER_BOUND } from '../utils/constants';

export const detectGimbalLock = (euler: EulerAngles): GimbalLockState => {
  const pitchAbs = Math.abs(euler.pitch);

  if (pitchAbs > GIMBAL_LOCK_THRESHOLD && pitchAbs < GIMBAL_LOCK_UPPER_BOUND) {
    const severity = Math.min(1, (pitchAbs - GIMBAL_LOCK_THRESHOLD) / (GIMBAL_LOCK_UPPER_BOUND - GIMBAL_LOCK_THRESHOLD));

    return {
      isLocked: true,
      lockAngle: euler.pitch,
      lockedAxis: 'pitch',
      severity,
    };
  }

  return {
    isLocked: false,
    lockAngle: 0,
    lockedAxis: 'pitch',
    severity: 0,
  };
};

export const isNearGimbalLock = (euler: EulerAngles, warningThreshold: number = 75): boolean => {
  const pitchAbs = Math.abs(euler.pitch);
  return pitchAbs > warningThreshold && pitchAbs <= GIMBAL_LOCK_THRESHOLD;
};

export const getGimbalLockDescription = (state: GimbalLockState): string => {
  if (!state.isLocked) return '无万向节锁';

  const direction = state.lockAngle > 0 ? '正向' : '负向';
  const severityText = state.severity > 0.7 ? '严重' : state.severity > 0.4 ? '中等' : '轻微';

  return `${severityText}万向节锁：俯仰角${direction} ${Math.abs(state.lockAngle).toFixed(1)}°，接近90°奇异点`;
};

export const calculateDegreesOfFreedom = (euler: EulerAngles): number => {
  const state = detectGimbalLock(euler);
  if (state.isLocked) {
    return 2;
  }
  return 3;
};

export const getLockingAxisInfo = (euler: EulerAngles): {
  lockedAxes: string[];
  freeAxes: string[];
} => {
  const state = detectGimbalLock(euler);

  if (state.isLocked) {
    return {
      lockedAxes: ['yaw', 'roll'],
      freeAxes: ['pitch'],
    };
  }

  return {
    lockedAxes: [],
    freeAxes: ['pitch', 'yaw', 'roll'],
  };
};
