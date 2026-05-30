import { useAttitudeStore } from '../../store/useAttitudeStore';
import { formatTime } from '../../utils/math';
import { getGimbalLockDescription, calculateDegreesOfFreedom } from '../../engine/gimbalLockDetector';

export const Timestamp = () => {
  const { playbackState, gimbalLockState, currentAngles } = useAttitudeStore();

  const degreesOfFreedom = calculateDegreesOfFreedom(currentAngles);
  const gimbalDescription = getGimbalLockDescription(gimbalLockState);

  return (
    <div
      className="absolute bottom-20 right-4 px-4 py-3 rounded border"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        borderColor: gimbalLockState.isLocked ? '#ff4d4f' : '#1e3a5f',
        boxShadow: gimbalLockState.isLocked
          ? '0 0 15px rgba(255, 77, 79, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="flex flex-col gap-2 min-w-48">
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-70" style={{ color: '#e8f4ff' }}>
            时间戳
          </span>
          <span className="text-lg font-mono font-bold" style={{ color: '#1890ff' }}>
            {formatTime(playbackState.currentTime)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs opacity-70" style={{ color: '#e8f4ff' }}>
            帧
          </span>
          <span className="text-sm font-mono" style={{ color: '#e8f4ff' }}>
            {playbackState.currentFrame + 1} / {playbackState.totalFrames || '-'}
          </span>
        </div>

        <div className="border-t border-slate-700 pt-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-70" style={{ color: '#e8f4ff' }}>
              自由度
            </span>
            <span
              className="text-sm font-mono font-bold"
              style={{ color: degreesOfFreedom < 3 ? '#ff4d4f' : '#52c41a' }}
            >
              {degreesOfFreedom} DOF
            </span>
          </div>
        </div>

        {gimbalLockState.isLocked && (
          <div
            className="mt-2 p-2 rounded text-xs"
            style={{
              backgroundColor: 'rgba(255, 77, 79, 0.15)',
              border: '1px solid #ff4d4f',
              color: '#ff4d4f',
            }}
          >
            <div className="font-bold mb-1">⚠ 万向节锁警告</div>
            <div className="text-xs opacity-90">{gimbalDescription}</div>
          </div>
        )}
      </div>
    </div>
  );
};
