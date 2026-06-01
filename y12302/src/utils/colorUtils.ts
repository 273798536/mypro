export const getDoseColor = (dose: number, minDose: number, maxDose: number): string => {
  const normalized = Math.max(0, Math.min(1, (dose - minDose) / (maxDose - minDose)));
  
  const colorStops = [
    { pos: 0.0, color: [0, 0, 255] },
    { pos: 0.25, color: [0, 255, 255] },
    { pos: 0.5, color: [0, 255, 0] },
    { pos: 0.75, color: [255, 255, 0] },
    { pos: 1.0, color: [255, 0, 0] },
  ];

  for (let i = 0; i < colorStops.length - 1; i++) {
    const start = colorStops[i];
    const end = colorStops[i + 1];
    
    if (normalized >= start.pos && normalized <= end.pos) {
      const t = (normalized - start.pos) / (end.pos - start.pos);
      const r = Math.round(start.color[0] + t * (end.color[0] - start.color[0]));
      const g = Math.round(start.color[1] + t * (end.color[1] - start.color[1]));
      const b = Math.round(start.color[2] + t * (end.color[2] - start.color[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  
  return 'rgb(255, 0, 0)';
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
};

export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-amber-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

export const getSeverityBgColor = (severity: string): string => {
  switch (severity) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export const getSourceLabel = (source: string): string => {
  return source === 'original' ? '原始材料' : '处理结果';
};

export const getSourceColor = (source: string): string => {
  return source === 'original' ? 'bg-emerald-600' : 'bg-sky-600';
};
