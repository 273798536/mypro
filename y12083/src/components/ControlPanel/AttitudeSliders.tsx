import { Sliders, RotateCcw } from 'lucide-react';
import { useAttitudeControl } from '../../hooks/useAttitudeControl';
import { AXIS_COLORS, AXIS_NAMES, GIMBAL_LOCK_THRESHOLD } from '../../utils/constants';
import { formatAngle } from '../../utils/math';
import { useAttitudeStore } from '../../store/useAttitudeStore';

export const AttitudeSliders = () => {
  const { currentAngles, setPitch, setYaw, setRoll, resetAngles, incrementAngle } = useAttitudeControl();
  const { gimbalLockState } = useAttitudeStore();

  const handleSliderChange = (axis: 'pitch' | 'yaw' | 'roll', value: number) => {
    const setters = { pitch: setPitch, yaw: setYaw, roll: setRoll };
    setters[axis](value);
  };

  const handleInputChange = (axis: 'pitch' | 'yaw' | 'roll', value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const setters = { pitch: setPitch, yaw: setYaw, roll: setRoll };
      setters[axis](num);
    }
  };

  const renderSlider = (axis: 'pitch' | 'yaw' | 'roll', min: number, max: number) => {
    const value = currentAngles[axis];
    const color = AXIS_COLORS[axis];
    const name = AXIS_NAMES[axis];
    const isNearLock = axis === 'pitch' && Math.abs(value) > GIMBAL_LOCK_THRESHOLD - 10;
    const isLocked = axis === 'pitch' && gimbalLockState.isLocked;

    return (
      <div key={axis} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium" style={{ color: '#e8f4ff' }}>
              {name}
            </span>
            {isLocked && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                锁定
              </span>
            )}
            {isNearLock && !isLocked && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-orange-500/20 text-orange-400">
                接近
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => incrementAngle(axis, -5)}
              className="w-6 h-6 text-xs rounded hover:bg-slate-700/50 transition-colors"
              style={{ color: '#e8f4ff' }}
            >
              -
            </button>
            <input
              type="number"
              value={value.toFixed(1)}
              onChange={(e) => handleInputChange(axis, e.target.value)}
              className="w-20 px-2 py-1 text-right text-sm font-mono rounded border bg-transparent focus:outline-none focus:border-blue-500"
              style={{
                borderColor: isLocked ? '#ff4d4f' : '#1e3a5f',
                color: isLocked ? '#ff4d4f' : '#e8f4ff',
              }}
            />
            <span className="text-xs opacity-60" style={{ color: '#64748b' }}>
              °
            </span>
            <button
              onClick={() => incrementAngle(axis, 5)}
              className="w-6 h-6 text-xs rounded hover:bg-slate-700/50 transition-colors"
              style={{ color: '#e8f4ff' }}
            >
              +
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={value}
            onChange={(e) => handleSliderChange(axis, parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #1e293b ${((value - min) / (max - min)) * 100}%, #1e293b 100%)`,
            }}
          />
          <div className="flex justify-between text-xs mt-1 opacity-60" style={{ color: '#64748b' }}>
            <span>{formatAngle(min)}</span>
            <span>{formatAngle(max)}</span>
          </div>
          {axis === 'pitch' && (
            <>
              <div
                className="absolute top-0 w-0.5 h-2"
                style={{
                  left: `${((-GIMBAL_LOCK_THRESHOLD - min) / (max - min)) * 100}%`,
                  backgroundColor: '#ff4d4f',
                  opacity: 0.5,
                }}
              />
              <div
                className="absolute top-0 w-0.5 h-2"
                style={{
                  left: `${((GIMBAL_LOCK_THRESHOLD - min) / (max - min)) * 100}%`,
                  backgroundColor: '#ff4d4f',
                  opacity: 0.5,
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders size={18} style={{ color: '#1890ff' }} />
          <h3 className="text-sm font-bold" style={{ color: '#e8f4ff' }}>
            手动姿态控制
          </h3>
        </div>
        <button
          onClick={resetAngles}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-700/50 transition-colors"
          style={{ color: '#64748b' }}
        >
          <RotateCcw size={12} />
          重置
        </button>
      </div>

      <div className="space-y-4">
        {renderSlider('pitch', -180, 180)}
        {renderSlider('yaw', -180, 180)}
        {renderSlider('roll', -180, 180)}
      </div>

      <div
        className="p-2 rounded text-xs"
        style={{
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          border: '1px solid rgba(24, 144, 255, 0.3)',
          color: '#1890ff',
        }}
      >
        <div className="font-medium mb-1">💡 提示</div>
        <div className="opacity-80">
          将俯仰角调整到 ±{GIMBAL_LOCK_THRESHOLD}° ~ ±95° 之间即可触发万向节锁演示。红色标记线为警戒区域。
        </div>
      </div>
    </div>
  );
};
