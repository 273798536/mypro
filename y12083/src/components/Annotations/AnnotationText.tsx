import { useAttitudeStore } from '../../store/useAttitudeStore';

interface AnnotationTextProps {
  text: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  type?: 'info' | 'warning' | 'error' | 'success';
}

export const AnnotationText = ({
  text,
  position = 'top-right',
  type = 'info',
}: AnnotationTextProps) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const typeStyles = {
    info: {
      bg: 'rgba(24, 144, 255, 0.15)',
      border: '#1890ff',
      color: '#1890ff',
    },
    warning: {
      bg: 'rgba(250, 173, 20, 0.15)',
      border: '#faad14',
      color: '#faad14',
    },
    error: {
      bg: 'rgba(255, 77, 79, 0.15)',
      border: '#ff4d4f',
      color: '#ff4d4f',
    },
    success: {
      bg: 'rgba(82, 196, 26, 0.15)',
      border: '#52c41a',
      color: '#52c41a',
    },
  };

  const style = typeStyles[type];

  return (
    <div
      className={`absolute ${positionClasses[position]} px-4 py-2 rounded border z-10`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
        boxShadow: `0 0 10px ${style.border}40`,
      }}
    >
      <div className="text-sm font-medium">{text}</div>
    </div>
  );
};

export const RemarksDisplay = () => {
  const { overallQuality } = useAttitudeStore();

  if (!overallQuality?.hasRemarks || overallQuality.remarks.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-20 left-4 px-4 py-3 rounded border z-10 max-w-xs"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        borderColor: '#1e3a5f',
        color: '#e8f4ff',
      }}
    >
      <div className="text-xs opacity-70 mb-1">模型备注</div>
      <div className="text-sm">
        {overallQuality.remarks.map((remark, index) => (
          <div key={index} className="mb-1 last:mb-0">
            • {remark}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DataQualityBadge = () => {
  const { overallQuality } = useAttitudeStore();

  if (!overallQuality) return null;

  const hasIssues = overallQuality.hasMissingFields || overallQuality.hasLateAxes;

  return (
    <div
      className="absolute top-4 right-4 px-3 py-2 rounded border z-10"
      style={{
        backgroundColor: hasIssues ? 'rgba(250, 173, 20, 0.15)' : 'rgba(82, 196, 26, 0.15)',
        borderColor: hasIssues ? '#faad14' : '#52c41a',
        color: hasIssues ? '#faad14' : '#52c41a',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: hasIssues ? '#faad14' : '#52c41a' }}
        />
        <span className="text-sm font-medium">
          数据质量：{hasIssues ? '存在问题' : '正常'}
        </span>
      </div>
      {hasIssues && (
        <div className="text-xs mt-1 opacity-80">
          {overallQuality.hasMissingFields && `缺字段: ${overallQuality.missingFields.join(', ')} `}
          {overallQuality.hasLateAxes && `晚到: ${overallQuality.lateAxes.join(', ')}`}
        </div>
      )}
    </div>
  );
};
