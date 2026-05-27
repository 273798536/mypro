import { GameState, InspectionReport, ReportItem } from '../types';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const getResourceName = (type: string): string => {
  const names: Record<string, string> = {
    drone: '无人机',
    cleaner: '清洗队',
    repair: '维修队'
  };
  return names[type] || type;
};

export const getFaultTypeName = (type: string): string => {
  const names: Record<string, string> = {
    panel_dirty: '光伏板积灰',
    inverter_fault: '逆变器故障',
    wire_damage: '线路损坏',
    unknown: '未知故障'
  };
  return names[type] || type;
};

export const getPriorityName = (priority: string): string => {
  const names: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  };
  return names[priority] || priority;
};

export const getWeatherName = (weather: string): string => {
  const names: Record<string, string> = {
    sunny: '晴天',
    cloudy: '多云',
    rainy: '雨天',
    stormy: '暴风雨'
  };
  return names[weather] || weather;
};

export const calculateEfficiency = (state: GameState): number => {
  const { resources, operations, totalTime } = state;
  if (resources.length === 0 || totalTime === 0) return 0;
  
  const totalWorkTime = resources.reduce((sum, r) => {
    return sum + (r.totalCooldown * operations.filter(op => op.resourceId === r.id).length);
  }, 0);
  
  const maxPossibleWork = resources.length * totalTime;
  return maxPossibleWork > 0 ? totalWorkTime / maxPossibleWork : 0;
};

export const evaluateBatteryManagement = (state: GameState): number => {
  const { battery, operations } = state;
  const batteryOperations = operations.filter(op => op.result === 'success');
  const avgBattery = batteryOperations.length > 0
    ? batteryOperations.reduce((sum) => sum + battery, 0) / batteryOperations.length
    : battery;
  
  if (avgBattery >= 60) return 100;
  if (avgBattery >= 40) return 75;
  if (avgBattery >= 20) return 50;
  return 25;
};

export const calculateRating = (score: number): 'S' | 'A' | 'B' | 'C' | 'D' => {
  if (score >= 1500) return 'S';
  if (score >= 1200) return 'A';
  if (score >= 900) return 'B';
  if (score >= 600) return 'C';
  return 'D';
};

export const getRatingColor = (rating: string): string => {
  const colors: Record<string, string> = {
    S: '#FFD700',
    A: '#10B981',
    B: '#3B82F6',
    C: '#F59E0B',
    D: '#EF4444'
  };
  return colors[rating] || '#6B7280';
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJSON = (report: InspectionReport): void => {
  const content = JSON.stringify(report, null, 2);
  downloadFile(content, `巡检报告-${report.levelName}-${Date.now()}.json`, 'application/json');
};

export const exportToCSV = (report: InspectionReport): void => {
  const headers = ['ID', '类型', '描述', '区域', '发现时间', '优先级', '来源', '处理人', '备注'];
  
  const itemsToCSV = (items: ReportItem[]): string => {
    return items.map(item => [
      item.id,
      item.type,
      `"${item.description}"`,
      item.areaName,
      formatTime(item.discoveredAt),
      item.priority,
      item.source,
      item.handler || '',
      `"${item.remarks || ''}"`
    ].join(',')).join('\n');
  };
  
  let csv = '\uFEFF';
  csv += headers.join(',') + '\n\n';
  
  csv += '=== 未处理项 ===\n';
  csv += itemsToCSV(report.unhandledItems) + '\n\n';
  
  csv += '=== 已修正项 ===\n';
  csv += itemsToCSV(report.correctedItems) + '\n\n';
  
  csv += '=== 待确认项 ===\n';
  csv += itemsToCSV(report.needConfirmItems) + '\n\n';
  
  csv += '=== 得分明细 ===\n';
  csv += '分类,描述,得分\n';
  report.scoreBreakdown.forEach(item => {
    csv += `${item.category},"${item.description}",${item.points}\n`;
  });
  
  downloadFile(csv, `巡检报告-${report.levelName}-${Date.now()}.csv`, 'text/csv;charset=utf-8');
};

export const saveGameState = (state: GameState): void => {
  try {
    localStorage.setItem('pv-game-state', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
};

export const loadGameState = (): GameState | null => {
  try {
    const saved = localStorage.getItem('pv-game-state');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load game state:', e);
    return null;
  }
};

export const saveReplayData = (data: GameState[]): void => {
  try {
    localStorage.setItem('pv-game-replay', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save replay data:', e);
  }
};

export const loadReplayData = (): GameState[] | null => {
  try {
    const saved = localStorage.getItem('pv-game-replay');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load replay data:', e);
    return null;
  }
};
