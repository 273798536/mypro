import {
  Visitor,
  Appointment,
  ServiceRecord,
  Window,
  Exception,
  DataSupplement,
  WindowStatusLog,
  BUSINESS_TYPES,
  WINDOW_NAMES,
} from '../types';
import { addMinutes, subDays, startOfDay, endOfDay } from 'date-fns';

const generateId = () => Math.random().toString(36).substring(2, 11);

const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomNormal = (mean: number, std: number) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std + mean;
};

export const generateMockData = () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const threeDaysAgo = subDays(todayStart, 2);

  const windows: Window[] = WINDOW_NAMES.map((name, index) => ({
    id: `win-${name.toLowerCase()}`,
    name,
    businessScope: BUSINESS_TYPES.slice(index % 3, (index % 3) + 3).map(t => t.value),
    status: Math.random() > 0.1 ? 'open' : (Math.random() > 0.5 ? 'paused' : 'closed'),
    pauseReason: Math.random() > 0.5 ? '设备维护' : undefined,
    pauseTime: Math.random() > 0.5 ? new Date() : undefined,
  }));

  const visitors: Visitor[] = [];
  const appointments: Appointment[] = [];
  const serviceRecords: ServiceRecord[] = [];
  const exceptions: Exception[] = [];
  const supplements: DataSupplement[] = [];
  const windowStatusLogs: WindowStatusLog[] = [];

  const totalRecords = 150;

  for (let i = 0; i < totalRecords; i++) {
    const minutesOffset = randomInt(0, 480);
    const daysOffset = randomInt(0, 2);
    const arrivalTime = addMinutes(addDays(threeDaysAgo, daysOffset), 480 + minutesOffset);

    const visitor: Visitor = {
      id: generateId(),
      arrivalTime,
      name: `办事群众${i + 1}`,
      idCard: `110101199${randomInt(0, 9)}${randomInt(1000, 9999)}${randomInt(1000, 9999)}`,
      status: 'completed',
      sourceChannel: randomItem(['walk_in', 'appointment', 'online'] as const),
    };
    visitors.push(visitor);

    if (visitor.sourceChannel === 'appointment' || Math.random() > 0.5) {
      const isNoShow = Math.random() < 0.08;
      const isSupplemented = Math.random() < 0.15;

      const appointment: Appointment = {
        id: generateId(),
        visitorId: visitor.id,
        appointmentNo: isSupplemented && Math.random() > 0.5 ? '' : `YY${2024}${String(randomInt(1, 99999)).padStart(6, '0')}`,
        appointmentTime: addMinutes(arrivalTime, randomInt(-30, 10)),
        businessType: randomItem(BUSINESS_TYPES).value,
        status: isNoShow ? 'no_show' : 'arrived',
        isSupplemented,
        supplementTime: isSupplemented ? addMinutes(arrivalTime, randomInt(30, 120)) : undefined,
        originalJudgment: isSupplemented ? '初始判断：无预约号，视为现场取号' : undefined,
      };
      appointments.push(appointment);

      if (isNoShow) {
        exceptions.push({
          id: generateId(),
          recordId: appointment.id,
          type: 'missed_appointment',
          severity: 'medium',
          status: randomItem(['pending', 'confirmed', 'resolved'] as const),
          description: `预约时间为${appointment.appointmentTime.toLocaleTimeString()}，超过15分钟未到达`,
          createdAt: addMinutes(appointment.appointmentTime, 15),
          confirmedAt: Math.random() > 0.3 ? addMinutes(appointment.appointmentTime, 20) : undefined,
          handler: Math.random() > 0.3 ? '管理员' : undefined,
          originalJudgment: '系统自动判定为爽约，待人工确认',
        });
      }

      if (isSupplemented && !appointment.appointmentNo) {
        const supplementTime = addMinutes(arrivalTime, randomInt(30, 120));
        supplements.push({
          id: generateId(),
          recordId: appointment.id,
          fieldName: 'appointment_no',
          oldValue: '',
          newValue: `YY${2024}${String(randomInt(1, 99999)).padStart(6, '0')}`,
          supplementTime,
          operator: '窗口操作员',
          affectedRecords: [appointment.id, visitor.id],
        });
      }
    }

    if (visitor.status === 'completed' || visitor.status === 'serving') {
      const serviceDuration = Math.max(1, Math.round(randomNormal(12, 8)));
      const isAbnormal = serviceDuration < 1 || serviceDuration > 60 || Math.random() < 0.05;
      const isSupplemented = Math.random() < 0.1;
      const window = randomItem(windows.filter(w => w.status === 'open' || Math.random() > 0.7));

      const serviceRecord: ServiceRecord = {
        id: generateId(),
        visitorId: visitor.id,
        windowId: window.id,
        startTime: addMinutes(arrivalTime, randomInt(0, 45)),
        endTime: addMinutes(arrivalTime, randomInt(0, 45) + serviceDuration),
        serviceDuration,
        businessType: randomItem(BUSINESS_TYPES).value,
        queuePosition: randomInt(1, 20),
        waitDuration: randomInt(0, 45),
        hasException: isAbnormal,
        originalJudgmentSnapshot: isSupplemented ? `初始服务时长：${serviceDuration}分钟，窗口：${window.name}` : undefined,
        isSupplemented,
        supplementFields: isSupplemented ? [randomItem(['service_duration', 'end_time', 'window_id'])] : [],
      };
      serviceRecords.push(serviceRecord);

      if (isAbnormal) {
        exceptions.push({
          id: generateId(),
          recordId: serviceRecord.id,
          type: 'abnormal_duration',
          severity: serviceDuration > 60 ? 'high' : 'medium',
          status: randomItem(['pending', 'confirmed', 'resolved'] as const),
          description: serviceDuration > 60
            ? `服务时长异常：${serviceDuration}分钟，超过正常阈值60分钟`
            : `服务时长异常：${serviceDuration}分钟，低于正常阈值1分钟`,
          createdAt: serviceRecord.endTime || new Date(),
          confirmedAt: Math.random() > 0.4 ? addMinutes(serviceRecord.endTime || new Date(), 10) : undefined,
          handler: Math.random() > 0.4 ? '管理员' : undefined,
          originalJudgment: serviceDuration > 60
            ? '系统判定为服务时长过长，可能存在特殊情况'
            : '系统判定为服务时长过短，可能存在操作异常',
        });
      }

      if (isSupplemented) {
        const supplementField = serviceRecord.supplementFields[0];
        const supplementTime = addMinutes(serviceRecord.endTime || new Date(), randomInt(10, 60));
        supplements.push({
          id: generateId(),
          recordId: serviceRecord.id,
          fieldName: supplementField,
          oldValue: supplementField === 'service_duration' ? String(serviceDuration) :
                    supplementField === 'window_id' ? window.id :
                    (serviceRecord.endTime?.toISOString() || ''),
          newValue: supplementField === 'service_duration' ? String(serviceDuration + randomInt(-5, 10)) :
                    supplementField === 'window_id' ? randomItem(windows).id :
                    addMinutes(serviceRecord.endTime || new Date(), randomInt(-10, 10)).toISOString(),
          supplementTime,
          operator: '数据管理员',
          affectedRecords: [serviceRecord.id],
        });
      }
    }
  }

  windows.forEach(window => {
    if (window.status === 'paused') {
      const pauseTime = window.pauseTime || new Date();
      windowStatusLogs.push({
        id: generateId(),
        windowId: window.id,
        timestamp: pauseTime,
        status: 'paused',
        reason: window.pauseReason,
      });

      exceptions.push({
        id: generateId(),
        recordId: window.id,
        type: 'window_pause',
        severity: 'medium',
        status: randomItem(['pending', 'confirmed', 'resolved'] as const),
        description: `窗口${window.name}暂停服务，原因：${window.pauseReason || '未知'}`,
        createdAt: pauseTime,
        confirmedAt: Math.random() > 0.5 ? addMinutes(pauseTime, 5) : undefined,
        handler: Math.random() > 0.5 ? '大厅主管' : undefined,
      });
    }
  });

  return {
    visitors,
    appointments,
    serviceRecords,
    windows,
    exceptions,
    supplements,
    windowStatusLogs,
    dateRange: [threeDaysAgo, todayEnd] as [Date, Date],
  };
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
