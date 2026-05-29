export const getLossColor = (
  value: number,
  min: number,
  max: number,
  useLogScale: boolean = false
): string => {
  let normalizedValue: number;
  
  if (useLogScale) {
    const logMin = Math.log1p(Math.max(min, 0));
    const logMax = Math.log1p(Math.max(max, 0));
    const logValue = Math.log1p(Math.max(value, 0));
    normalizedValue = (logValue - logMin) / (logMax - logMin);
  } else {
    normalizedValue = (value - min) / (max - min);
  }
  
  normalizedValue = Math.max(0, Math.min(1, normalizedValue));
  
  const r = Math.round(59 + normalizedValue * 175);
  const g = Math.round(130 - normalizedValue * 60);
  const b = Math.round(246 - normalizedValue * 200);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const getAnomalyColor = (type: string): string => {
  switch (type) {
    case 'missing_step':
      return '#FBBF24';
    case 'loss_explosion':
      return '#EF4444';
    case 'scale_misread':
      return '#F59E0B';
    default:
      return '#FBBF24';
  }
};

export const getAnomalyIcon = (type: string): string => {
  switch (type) {
    case 'missing_step':
      return '⏱️';
    case 'loss_explosion':
      return '💥';
    case 'scale_misread':
      return '📏';
    default:
      return '⚠️';
  }
};

export const getAnomalyTitle = (type: string): string => {
  switch (type) {
    case 'missing_step':
      return '日志缺步';
    case 'loss_explosion':
      return '损失爆炸';
    case 'scale_misread':
      return '坐标尺度误读';
    default:
      return '未知异常';
  }
};
