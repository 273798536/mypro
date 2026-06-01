export const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const formatNumber = (value: number, decimals: number = 4): string => {
  return value.toFixed(decimals);
};

export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

export const truncateId = (id: string, maxLength: number = 12): string => {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength - 3)}...`;
};

export const getMaterialColor = (material: string): string => {
  const colors: Record<string, string> = {
    '45号钢': '#6B7484',
    '铸铁': '#525A68',
    '铝合金': '#AFB9C9',
    '不锈钢': '#8A94A6',
    '铜': '#D4DBE6',
  };
  return colors[material] || '#6B7484';
};

export const getFrictionHeatColor = (coefficient: number): string => {
  if (coefficient < 0.02) return '#10B981';
  if (coefficient < 0.03) return '#F59E0B';
  return '#EF4444';
};

export const getDeviationColor = (deviation: number): string => {
  if (Math.abs(deviation) < 2) return '#10B981';
  if (Math.abs(deviation) < 5) return '#F59E0B';
  return '#EF4444';
};
