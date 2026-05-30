import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { WarningCard } from './WarningCard';
import { generateCorrection, getWarningTypeLabel } from '../../engine/correctionEngine';
import { generateId } from '../../utils/math';

export const DiagnosticPanel = () => {
  const { currentWarnings, currentAngles, gimbalLockState } = useAttitudeStore();

  const warningsWithCorrections = currentWarnings.map((warning) => {
    if (warning.correctionSteps.length === 0) {
      const correction = generateCorrection(warning, currentAngles, gimbalLockState);
      return {
        ...warning,
        correctionSteps: correction.steps,
      };
    }
    return warning;
  });

  const gimbalLockWarning = warningsWithCorrections.find((w) => w.type === 'gimbal_lock');
  const otherWarnings = warningsWithCorrections.filter((w) => w.type !== 'gimbal_lock');

  const hasErrors = warningsWithCorrections.length > 0;
  const hasGimbalLock = !!gimbalLockWarning;

  const sortedWarnings = [
    ...(gimbalLockWarning ? [gimbalLockWarning] : []),
    ...otherWarnings.sort((a, b) => {
      const priority = {
        angle_out_of_range: 1,
        axis_reversed: 2,
        trend_reversed: 2,
        missing_data: 3,
        late_axis: 4,
      } as const;
      return priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority];
    }),
  ];

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 w-80 max-h-[60vh] z-20 rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.97)',
        borderColor: hasGimbalLock ? '#ff4d4f' : hasErrors ? '#faad14' : '#1e3a5f',
        backdropFilter: 'blur(10px)',
        boxShadow: hasGimbalLock
          ? '0 0 20px rgba(255, 77, 79, 0.3)'
          : hasErrors
          ? '0 0 15px rgba(250, 173, 20, 0.2)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b"
        style={{
          backgroundColor: hasGimbalLock
            ? 'rgba(255, 77, 79, 0.15)'
            : hasErrors
            ? 'rgba(250, 173, 20, 0.15)'
            : 'rgba(30, 58, 95, 0.5)',
          borderColor: '#1e3a5f',
        }}
      >
        {hasGimbalLock ? (
          <AlertCircle size={18} style={{ color: '#ff4d4f' }} />
        ) : hasErrors ? (
          <Activity size={18} style={{ color: '#faad14' }} />
        ) : (
          <CheckCircle size={18} style={{ color: '#52c41a' }} />
        )}
        <h3
          className="text-sm font-bold"
          style={{
            color: hasGimbalLock ? '#ff4d4f' : hasErrors ? '#faad14' : '#52c41a',
          }}
        >
          {hasGimbalLock
            ? '⚠ 万向节锁警告'
            : hasErrors
            ? `检测到 ${sortedWarnings.length} 个问题`
            : '状态正常'}
        </h3>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: hasGimbalLock
              ? 'rgba(255, 77, 79, 0.2)'
              : hasErrors
              ? 'rgba(250, 173, 20, 0.2)'
              : 'rgba(82, 196, 26, 0.2)',
            color: hasGimbalLock ? '#ff4d4f' : hasErrors ? '#faad14' : '#52c41a',
          }}
        >
          {sortedWarnings.length}
        </span>
      </div>

      <div className="p-3 space-y-3 max-h-[calc(60vh-50px)] overflow-y-auto">
        {sortedWarnings.length > 0 ? (
          sortedWarnings.map((warning) => (
            <WarningCard key={warning.id} warning={warning} />
          ))
        ) : (
          <div
            className="p-6 rounded-lg text-center"
            style={{
              backgroundColor: 'rgba(82, 196, 26, 0.1)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
            }}
          >
            <CheckCircle size={32} style={{ color: '#52c41a', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: '#52c41a' }}>
              当前姿态参数正常
            </p>
            <p className="text-xs mt-1 opacity-70" style={{ color: '#94a3b8' }}>
              无万向节锁、角度越界或坐标轴反向问题
            </p>
          </div>
        )}

        {hasGimbalLock && (
          <div
            className="p-3 rounded-lg text-xs"
            style={{
              backgroundColor: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <div className="font-medium mb-2" style={{ color: '#ff4d4f' }}>
              🔴 万向节锁原理说明
            </div>
            <p className="mb-2 opacity-90" style={{ color: '#e8f4ff' }}>
              万向节锁发生在欧拉角表示中，当俯仰角（Pitch）接近±90°时，偏航角（Yaw）和滚转角（Roll）的旋转轴会重合，导致失去一个旋转自由度。
            </p>
            <ul className="space-y-1 opacity-80" style={{ color: '#94a3b8' }}>
              <li>• 此时偏航和滚转操作会产生相同的旋转效果</li>
              <li>• 航天器会失去一个方向的控制能力</li>
              <li>• 根本解决方法是使用四元数表示姿态</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
