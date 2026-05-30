import { useMemo } from 'react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { AXIS_COLORS, AXIS_NAMES } from '../../utils/constants';
import { formatAngle } from '../../utils/math';

interface AngleLabelProps {
  axis: 'pitch' | 'yaw' | 'roll';
}

export const AngleLabel = ({ axis }: AngleLabelProps) => {
  const { currentAngles, gimbalLockState } = useAttitudeStore();

  const value = currentAngles[axis];
  const color = AXIS_COLORS[axis];
  const name = AXIS_NAMES[axis];

  const isWarning = useMemo(() => {
    if (gimbalLockState.isLocked && (axis === 'yaw' || axis === 'roll')) {
      return true;
    }
    if (axis === 'pitch' && gimbalLockState.isLocked) {
      return true;
    }
    return false;
  }, [axis, gimbalLockState]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.9)',
        borderColor: isWarning ? '#ff4d4f' : color,
        boxShadow: isWarning ? '0 0 10px rgba(255, 77, 79, 0.5)' : `0 0 5px ${color}40`,
      }}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-col">
        <span className="text-xs opacity-70" style={{ color: '#e8f4ff' }}>
          {name} ({axis.toUpperCase()})
        </span>
        <span
          className="text-lg font-mono font-bold"
          style={{ color: isWarning ? '#ff4d4f' : color }}
        >
          {formatAngle(value)}
        </span>
      </div>
      {isWarning && (
        <div className="ml-2 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
          {axis === 'pitch' ? '锁定轴' : '受影响'}
        </div>
      )}
    </div>
  );
};

export const AngleLabelsGroup = () => {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
      <AngleLabel axis="pitch" />
      <AngleLabel axis="yaw" />
      <AngleLabel axis="roll" />
    </div>
  );
};
