import type { VisitRecord, WindowShift, Holiday, Experiment } from '@/types';

const baseDate = new Date('2026-05-26');

function createTime(hours: number, minutes: number = 0): Date {
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const mockVisits: VisitRecord[] = [
  { id: generateId(), visitorId: 'V001', arriveTime: createTime(8, 10), appointmentTime: createTime(8, 15), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V002', arriveTime: createTime(8, 15), appointmentTime: createTime(8, 20), status: 'appointed', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V003', arriveTime: createTime(8, 20), status: 'walkIn', serviceDuration: 6, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V004', arriveTime: createTime(8, 25), appointmentTime: createTime(8, 30), status: 'appointed', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V005', arriveTime: createTime(8, 30), status: 'walkIn', serviceDuration: 15, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V006', arriveTime: createTime(8, 35), appointmentTime: createTime(8, 40), status: 'appointed', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V007', arriveTime: createTime(8, 40), appointmentTime: createTime(8, 45), status: 'appointed', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V008', arriveTime: createTime(8, 45), status: 'walkIn', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V009', arriveTime: createTime(8, 50), appointmentTime: createTime(9, 0), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V010', arriveTime: createTime(8, 55), status: 'walkIn', serviceDuration: 13, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V011', arriveTime: createTime(9, 0), appointmentTime: createTime(9, 5), status: 'appointed', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V012', arriveTime: createTime(9, 5), appointmentTime: createTime(9, 10), status: 'appointed', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V013', arriveTime: createTime(9, 10), status: 'walkIn', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V014', arriveTime: createTime(9, 15), appointmentTime: createTime(9, 20), status: 'appointed', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V015', arriveTime: createTime(9, 20), status: 'walkIn', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V016', arriveTime: createTime(9, 25), appointmentTime: createTime(9, 30), status: 'appointed', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V017', arriveTime: createTime(9, 30), appointmentTime: createTime(9, 35), status: 'appointed', serviceDuration: 6, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V018', arriveTime: createTime(9, 35), status: 'walkIn', serviceDuration: 14, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V019', arriveTime: createTime(9, 40), appointmentTime: createTime(9, 45), status: 'appointed', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V020', arriveTime: createTime(9, 45), status: 'walkIn', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V021', arriveTime: createTime(9, 50), appointmentTime: createTime(9, 55), status: 'appointed', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V022', arriveTime: createTime(9, 55), appointmentTime: createTime(10, 0), status: 'appointed', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V023', arriveTime: createTime(10, 0), status: 'walkIn', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V024', arriveTime: createTime(10, 5), appointmentTime: createTime(10, 10), status: 'appointed', serviceDuration: 13, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V025', arriveTime: createTime(10, 10), status: 'walkIn', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V026', arriveTime: createTime(10, 15), appointmentTime: createTime(10, 20), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V027', arriveTime: createTime(10, 20), appointmentTime: createTime(10, 25), status: 'appointed', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V028', arriveTime: createTime(10, 25), status: 'walkIn', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V029', arriveTime: createTime(10, 30), appointmentTime: createTime(10, 35), status: 'appointed', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V030', arriveTime: createTime(10, 35), status: 'walkIn', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V031', arriveTime: createTime(10, 40), appointmentTime: createTime(10, 45), status: 'appointed', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V032', arriveTime: createTime(10, 45), appointmentTime: createTime(10, 50), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V033', arriveTime: createTime(10, 50), status: 'walkIn', serviceDuration: 14, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V034', arriveTime: createTime(10, 55), appointmentTime: createTime(11, 0), status: 'appointed', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V035', arriveTime: createTime(11, 0), status: 'walkIn', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V036', arriveTime: createTime(13, 30), appointmentTime: createTime(13, 35), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V037', arriveTime: createTime(13, 35), appointmentTime: createTime(13, 40), status: 'appointed', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V038', arriveTime: createTime(13, 40), status: 'walkIn', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V039', arriveTime: createTime(13, 45), appointmentTime: createTime(13, 50), status: 'appointed', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V040', arriveTime: createTime(13, 50), status: 'walkIn', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V041', arriveTime: createTime(13, 55), appointmentTime: createTime(14, 0), status: 'appointed', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V042', arriveTime: createTime(14, 0), appointmentTime: createTime(14, 5), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V043', arriveTime: createTime(14, 5), status: 'walkIn', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V044', arriveTime: createTime(14, 10), appointmentTime: createTime(14, 15), status: 'appointed', serviceDuration: 13, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V045', arriveTime: createTime(14, 15), status: 'walkIn', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V046', arriveTime: createTime(14, 20), appointmentTime: createTime(14, 25), status: 'appointed', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V047', arriveTime: createTime(14, 25), appointmentTime: createTime(14, 30), status: 'appointed', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V048', arriveTime: createTime(14, 30), status: 'walkIn', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V049', arriveTime: createTime(14, 35), appointmentTime: createTime(14, 40), status: 'appointed', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V050', arriveTime: createTime(14, 40), status: 'walkIn', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V051', arriveTime: createTime(14, 45), appointmentTime: createTime(14, 50), status: 'appointed', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V052', arriveTime: createTime(14, 50), appointmentTime: createTime(14, 55), status: 'appointed', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V053', arriveTime: createTime(14, 55), status: 'walkIn', serviceDuration: 11, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V054', arriveTime: createTime(15, 0), appointmentTime: createTime(15, 5), status: 'appointed', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V055', arriveTime: createTime(15, 5), status: 'walkIn', serviceDuration: 10, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V056', arriveTime: createTime(15, 10), appointmentTime: createTime(15, 15), status: 'appointed', serviceDuration: 13, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V057', arriveTime: createTime(15, 15), appointmentTime: createTime(15, 20), status: 'appointed', serviceDuration: 7, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V058', arriveTime: createTime(15, 20), status: 'walkIn', serviceDuration: 9, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V059', arriveTime: createTime(15, 25), appointmentTime: createTime(15, 30), status: 'appointed', serviceDuration: 12, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'V060', arriveTime: createTime(15, 30), status: 'walkIn', serviceDuration: 8, dataGroup: 'normal' },
  { id: generateId(), visitorId: 'B001', arriveTime: createTime(9, 15), appointmentTime: createTime(9, 20), status: 'noShow', serviceDuration: 8, dataGroup: 'boundary', notes: '预约爽约' },
  { id: generateId(), visitorId: 'B002', arriveTime: createTime(10, 30), appointmentTime: createTime(10, 35), status: 'noShow', serviceDuration: 10, dataGroup: 'boundary', notes: '预约爽约' },
  { id: generateId(), visitorId: 'B003', arriveTime: createTime(14, 10), appointmentTime: createTime(14, 15), status: 'noShow', serviceDuration: 7, dataGroup: 'boundary', notes: '预约爽约' },
  { id: generateId(), visitorId: 'B004', arriveTime: createTime(9, 20), appointmentTime: createTime(9, 25), status: 'appointed', serviceDuration: 45, dataGroup: 'boundary', notes: '服务时长异常过长: 45分钟' },
  { id: generateId(), visitorId: 'B005', arriveTime: createTime(11, 10), status: 'walkIn', serviceDuration: 38, dataGroup: 'boundary', notes: '服务时长异常过长: 38分钟' },
  { id: generateId(), visitorId: 'B006', arriveTime: createTime(13, 45), appointmentTime: createTime(13, 50), status: 'appointed', serviceDuration: 1, dataGroup: 'boundary', notes: '服务时长异常过短: 1分钟' },
  { id: generateId(), visitorId: 'E001', arriveTime: createTime(8, 30), status: 'walkIn', serviceDuration: -5, dataGroup: 'badInput', notes: '服务时长为负数' },
  { id: generateId(), visitorId: '', arriveTime: createTime(9, 0), status: 'walkIn', serviceDuration: 10, dataGroup: 'badInput', notes: '访客ID为空' },
];

export const mockWindows: WindowShift[] = [
  {
    id: generateId(),
    windowNo: 1,
    startTime: createTime(8, 0),
    endTime: createTime(12, 0),
    capacity: 60,
    isTemporaryClosed: false
  },
  {
    id: generateId(),
    windowNo: 1,
    startTime: createTime(13, 30),
    endTime: createTime(17, 0),
    capacity: 60,
    isTemporaryClosed: true,
    closeStartTime: createTime(15, 0),
    closeEndTime: createTime(15, 30)
  },
  {
    id: generateId(),
    windowNo: 2,
    startTime: createTime(8, 0),
    endTime: createTime(12, 0),
    capacity: 60,
    isTemporaryClosed: false
  },
  {
    id: generateId(),
    windowNo: 2,
    startTime: createTime(13, 30),
    endTime: createTime(17, 0),
    capacity: 60,
    isTemporaryClosed: false
  },
  {
    id: generateId(),
    windowNo: 3,
    startTime: createTime(8, 0),
    endTime: createTime(12, 0),
    capacity: 60,
    isTemporaryClosed: false
  },
  {
    id: generateId(),
    windowNo: 3,
    startTime: createTime(13, 30),
    endTime: createTime(17, 0),
    capacity: 60,
    isTemporaryClosed: true,
    closeStartTime: createTime(14, 30),
    closeEndTime: createTime(15, 0)
  },
  {
    id: generateId(),
    windowNo: 4,
    startTime: createTime(9, 0),
    endTime: createTime(12, 0),
    capacity: 60,
    isTemporaryClosed: false
  },
  {
    id: generateId(),
    windowNo: 4,
    startTime: createTime(13, 30),
    endTime: createTime(16, 30),
    capacity: 60,
    isTemporaryClosed: false
  }
];

export const mockHolidays: Holiday[] = [
  { id: generateId(), date: '2026-05-25', type: 'weekend', name: '星期日' },
  { id: generateId(), date: '2026-05-26', type: 'workday', name: '星期一' },
  { id: generateId(), date: '2026-05-27', type: 'workday', name: '星期二' },
  { id: generateId(), date: '2026-05-28', type: 'workday', name: '星期三' },
  { id: generateId(), date: '2026-05-29', type: 'workday', name: '星期四' },
  { id: generateId(), date: '2026-05-30', type: 'workday', name: '星期五' },
  { id: generateId(), date: '2026-05-31', type: 'weekend', name: '星期六' },
  { id: generateId(), date: '2026-06-01', type: 'weekend', name: '星期日' },
  { id: generateId(), date: '2026-06-02', type: 'holiday', name: '端午节' }
];

export const mockExperiments: Experiment[] = [
  {
    id: 'exp-001',
    name: '基础配置实验（3个窗口）',
    config: {
      windowCount: 3,
      simulationTime: 480,
      includeBoundary: false,
      includeBadInput: false
    },
    status: 'completed',
    createdAt: new Date('2026-05-26T09:00:00'),
    progress: 100
  },
  {
    id: 'exp-002',
    name: '高峰配置实验（4个窗口）',
    config: {
      windowCount: 4,
      simulationTime: 480,
      includeBoundary: false,
      includeBadInput: false
    },
    status: 'completed',
    createdAt: new Date('2026-05-26T09:15:00'),
    progress: 100
  },
  {
    id: 'exp-003',
    name: '含边界值实验（3个窗口）',
    config: {
      windowCount: 3,
      simulationTime: 480,
      includeBoundary: true,
      includeBadInput: false
    },
    status: 'completed',
    createdAt: new Date('2026-05-26T09:30:00'),
    progress: 100
  },
  {
    id: 'exp-004',
    name: '保守配置实验（5个窗口）',
    config: {
      windowCount: 5,
      simulationTime: 480,
      includeBoundary: true,
      includeBadInput: true
    },
    status: 'pending',
    createdAt: new Date('2026-05-26T10:00:00'),
    progress: 0
  }
];
