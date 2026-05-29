import { ExperimentDataRow } from '@/types';
import { generateId } from '@/lib/utils';

export const sampleExperimentData: ExperimentDataRow[] = [
  {
    id: generateId(),
    date: '2024-01-01',
    historicalConversion: 0.032,
    dailyTraffic: 12500,
    minimumLift: 0.05,
    remarks: '元旦假期数据',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-02',
    historicalConversion: 0.028,
    dailyTraffic: 11200,
    minimumLift: 0.05,
    remarks: '',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-03',
    historicalConversion: 0.035,
    dailyTraffic: null,
    minimumLift: 0.05,
    remarks: '流量统计异常',
    isDirty: true,
    dirtyReason: '日流量为空',
  },
  {
    id: generateId(),
    date: '2024-01-04',
    historicalConversion: 0.031,
    dailyTraffic: 13200,
    minimumLift: null,
    remarks: '',
    isDirty: true,
    dirtyReason: '最小提升为空',
  },
  {
    id: generateId(),
    date: '2024-01-05',
    historicalConversion: 0.029,
    dailyTraffic: 12800,
    minimumLift: 0.05,
    remarks: '',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-06',
    historicalConversion: 0.025,
    dailyTraffic: 9800,
    minimumLift: 0.05,
    remarks: '周六',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-07',
    historicalConversion: 0.023,
    dailyTraffic: 8500,
    minimumLift: 0.05,
    remarks: '周日',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-08',
    historicalConversion: null,
    dailyTraffic: 14200,
    minimumLift: 0.05,
    remarks: '数据缺失',
    isDirty: true,
    dirtyReason: '历史转化率为空',
  },
  {
    id: generateId(),
    date: '2024-01-09',
    historicalConversion: 0.033,
    dailyTraffic: 13500,
    minimumLift: 0.05,
    remarks: '',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-10',
    historicalConversion: 0.036,
    dailyTraffic: 14100,
    minimumLift: 0.05,
    remarks: '活动推广日',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-11',
    historicalConversion: 0.032,
    dailyTraffic: 13800,
    minimumLift: 0.05,
    remarks: '',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-12',
    historicalConversion: 0.030,
    dailyTraffic: 12900,
    minimumLift: null,
    remarks: '备注：待确认提升目标',
    isDirty: true,
    dirtyReason: '最小提升为空',
  },
  {
    id: generateId(),
    date: '2024-01-13',
    historicalConversion: 0.026,
    dailyTraffic: 10200,
    minimumLift: 0.05,
    remarks: '周六',
    isDirty: false,
    dirtyReason: '',
  },
  {
    id: generateId(),
    date: '2024-01-14',
    historicalConversion: 0.024,
    dailyTraffic: 9100,
    minimumLift: 0.05,
    remarks: '周日',
    isDirty: false,
    dirtyReason: '',
  },
];

export function cleanData(data: ExperimentDataRow[]): { cleaned: ExperimentDataRow[]; logs: string[] } {
  const logs: string[] = [];
  const cleaned: ExperimentDataRow[] = [];
  
  data.forEach((row, index) => {
    if (row.isDirty) {
      logs.push(`第 ${index + 1} 行（${row.date}）：${row.dirtyReason}，已跳过`);
    } else {
      cleaned.push(row);
    }
  });
  
  return { cleaned, logs };
}

export function getAverageConversion(data: ExperimentDataRow[]): number {
  const validValues = data
    .filter(row => !row.isDirty && row.historicalConversion !== null)
    .map(row => row.historicalConversion as number);
  
  if (validValues.length === 0) return 0.03;
  
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

export function getAverageTraffic(data: ExperimentDataRow[]): number {
  const validValues = data
    .filter(row => !row.isDirty && row.dailyTraffic !== null)
    .map(row => row.dailyTraffic as number);
  
  if (validValues.length === 0) return 10000;
  
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}
