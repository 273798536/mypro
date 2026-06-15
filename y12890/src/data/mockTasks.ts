import { Task, TaskStatus, RiskLevel } from '../types/task';
import { FARM_NAME } from './mockMapData';

export const MOCK_TASKS: Task[] = [
  {
    id: 'task_001',
    name: '6月上旬水下机器人常规巡检',
    uploadedAt: new Date('2026-06-16T09:30:00'),
    uploadedBy: '李场长',
    status: TaskStatus.PENDING_REVIEW,
    qualityScore: 78,
    riskLevel: RiskLevel.MEDIUM,
    description: '涵盖A1-A5、B1-B3、C1-C2共10个监测点位的潮汐和水质数据采集',
    farmName: FARM_NAME,
    dateRange: {
      start: new Date('2026-06-01'),
      end: new Date('2026-06-15'),
    },
    statistics: {
      totalRecords: 105,
      nullValues: 4,
      duplicates: 3,
      unitMixed: 2,
      timezoneErrors: 1,
      outOfRange: 2,
    },
  },
  {
    id: 'task_002',
    name: 'B区深水养殖区专项监测',
    uploadedAt: new Date('2026-06-10T14:20:00'),
    uploadedBy: '张工程师',
    status: TaskStatus.REVIEWED,
    qualityScore: 92,
    riskLevel: RiskLevel.LOW,
    description: '针对B区深水养殖区的高密度监测，每2小时采集一次',
    farmName: FARM_NAME,
    dateRange: {
      start: new Date('2026-05-20'),
      end: new Date('2026-06-05'),
    },
    statistics: {
      totalRecords: 192,
      nullValues: 2,
      duplicates: 1,
      unitMixed: 0,
      timezoneErrors: 0,
      outOfRange: 1,
    },
  },
  {
    id: 'task_003',
    name: '暴雨后水质应急监测',
    uploadedAt: new Date('2026-06-08T11:00:00'),
    uploadedBy: '李场长',
    status: TaskStatus.EXPORTED,
    qualityScore: 85,
    riskLevel: RiskLevel.HIGH,
    description: '6月7日暴雨后紧急采集的进水渠和近岸区水质数据',
    farmName: FARM_NAME,
    dateRange: {
      start: new Date('2026-06-07'),
      end: new Date('2026-06-08'),
    },
    statistics: {
      totalRecords: 48,
      nullValues: 1,
      duplicates: 0,
      unitMixed: 1,
      timezoneErrors: 0,
      outOfRange: 3,
    },
  },
  {
    id: 'task_004',
    name: '月度潮汐基准校准',
    uploadedAt: new Date('2026-06-01T08:00:00'),
    uploadedBy: '王技术员',
    status: TaskStatus.UPLOADED,
    qualityScore: 0,
    riskLevel: RiskLevel.LOW,
    description: '每月初进行的潮汐基准站数据校准任务',
    farmName: FARM_NAME,
    dateRange: {
      start: new Date('2026-05-25'),
      end: new Date('2026-06-01'),
    },
    statistics: {
      totalRecords: 168,
      nullValues: 0,
      duplicates: 0,
      unitMixed: 0,
      timezoneErrors: 0,
      outOfRange: 0,
    },
  },
];

export function getTaskById(id: string): Task | undefined {
  return MOCK_TASKS.find(t => t.id === id);
}
