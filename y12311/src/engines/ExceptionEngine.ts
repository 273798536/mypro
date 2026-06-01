import { create } from 'zustand';
import {
  ServiceRecord,
  Appointment,
  Window,
  Exception,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
  ABNORMAL_DURATION_THRESHOLD,
  NO_SHOW_THRESHOLD,
} from '../types';
import { addMinutes, differenceInMinutes } from 'date-fns';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface ExceptionStore {
  exceptions: Exception[];
  setExceptions: (exceptions: Exception[]) => void;
  addException: (exception: Exception) => void;
  updateException: (id: string, updates: Partial<Exception>) => void;
  updateExceptionStatus: (id: string, status: ExceptionStatus, handler?: string, remark?: string) => void;
  batchUpdateStatus: (ids: string[], status: ExceptionStatus, handler?: string) => void;
  getExceptionsByStatus: (status: ExceptionStatus) => Exception[];
  getExceptionsByType: (type: ExceptionType) => Exception[];
}

export const useExceptionStore = create<ExceptionStore>((set, get) => ({
  exceptions: [],

  setExceptions: (exceptions) => set({ exceptions }),

  addException: (exception) => set((state) => ({
    exceptions: [...state.exceptions, exception],
  })),

  updateException: (id, updates) => set((state) => ({
    exceptions: state.exceptions.map((ex) =>
      ex.id === id ? { ...ex, ...updates } : ex
    ),
  })),

  updateExceptionStatus: (id, status, handler, remark) => set((state) => ({
    exceptions: state.exceptions.map((ex) =>
      ex.id === id
        ? {
            ...ex,
            status,
            confirmedAt: status !== 'pending' ? new Date() : ex.confirmedAt,
            resolvedAt: status === 'resolved' ? new Date() : ex.resolvedAt,
            handler: handler || ex.handler,
            remark: remark || ex.remark,
          }
        : ex
    ),
  })),

  batchUpdateStatus: (ids, status, handler) => set((state) => ({
    exceptions: state.exceptions.map((ex) =>
      ids.includes(ex.id)
        ? {
            ...ex,
            status,
            confirmedAt: status !== 'pending' ? new Date() : ex.confirmedAt,
            resolvedAt: status === 'resolved' ? new Date() : ex.resolvedAt,
            handler: handler || ex.handler,
          }
        : ex
    ),
  })),

  getExceptionsByStatus: (status) => get().exceptions.filter((ex) => ex.status === status),
  getExceptionsByType: (type) => get().exceptions.filter((ex) => ex.type === type),
}));

export class ExceptionEngine {
  detectMissedAppointment(appointment: Appointment, currentTime: Date = new Date()): Exception | null {
    if (appointment.status !== 'no_show') {
      const gracePeriodEnd = addMinutes(appointment.appointmentTime, NO_SHOW_THRESHOLD.GRACE_PERIOD);
      if (currentTime > gracePeriodEnd && appointment.status === 'pending') {
        return this.createException(
          appointment.id,
          'missed_appointment',
          'medium',
          `预约时间为${appointment.appointmentTime.toLocaleTimeString()}，超过${NO_SHOW_THRESHOLD.GRACE_PERIOD}分钟未到达`,
          '系统自动判定为爽约，待人工确认'
        );
      }
    } else if (appointment.status === 'no_show') {
      return this.createException(
        appointment.id,
        'missed_appointment',
        'medium',
        `预约时间为${appointment.appointmentTime.toLocaleTimeString()}，已标记为爽约`,
        '系统标记为爽约'
      );
    }
    return null;
  }

  detectAbnormalDuration(record: ServiceRecord, allRecords: ServiceRecord[]): Exception | null {
    const { MIN, MAX, STD_MULTIPLE } = ABNORMAL_DURATION_THRESHOLD;

    const durations = allRecords
      .filter((r) => r.serviceDuration > 0 && r.serviceDuration <= MAX)
      .map((r) => r.serviceDuration);

    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
    const std = Math.sqrt(variance);

    const isTooShort = record.serviceDuration < MIN;
    const isTooLong = record.serviceDuration > MAX;
    const isOutlier = Math.abs(record.serviceDuration - mean) > STD_MULTIPLE * std;

    if (isTooShort || isTooLong || isOutlier) {
      let description = '';
      let severity: ExceptionSeverity = 'medium';
      let originalJudgment = '';

      if (isTooShort) {
        description = `服务时长异常：${record.serviceDuration}分钟，低于正常阈值${MIN}分钟`;
        originalJudgment = '系统判定为服务时长过短，可能存在操作异常';
      } else if (isTooLong) {
        description = `服务时长异常：${record.serviceDuration}分钟，超过正常阈值${MAX}分钟`;
        severity = 'high';
        originalJudgment = '系统判定为服务时长过长，可能存在特殊情况';
      } else {
        description = `服务时长异常：${record.serviceDuration}分钟，偏离平均值${mean.toFixed(1)}分钟超过${STD_MULTIPLE}倍标准差`;
        originalJudgment = '系统判定为服务时长异常值，需要人工核实';
      }

      return this.createException(
        record.id,
        'abnormal_duration',
        severity,
        description,
        originalJudgment
      );
    }

    return null;
  }

  detectWindowPause(window: Window): Exception | null {
    if (window.status === 'paused') {
      const pauseDuration = window.pauseTime
        ? differenceInMinutes(new Date(), window.pauseTime)
        : 0;

      const severity: ExceptionSeverity = pauseDuration > 30 ? 'high' : pauseDuration > 15 ? 'medium' : 'low';

      return this.createException(
        window.id,
        'window_pause',
        severity,
        `窗口${window.name}暂停服务${pauseDuration > 0 ? `已${pauseDuration}分钟` : ''}，原因：${window.pauseReason || '未知'}`,
        `窗口暂停服务，暂停时间：${window.pauseTime?.toLocaleString() || '未记录'}`
      );
    }
    return null;
  }

  processAllExceptions(
    records: ServiceRecord[],
    appointments: Appointment[],
    windows: Window[]
  ): Exception[] {
    const exceptions: Exception[] = [];

    appointments.forEach((appointment) => {
      const ex = this.detectMissedAppointment(appointment);
      if (ex) exceptions.push(ex);
    });

    records.forEach((record) => {
      const ex = this.detectAbnormalDuration(record, records);
      if (ex) exceptions.push(ex);
    });

    windows.forEach((window) => {
      const ex = this.detectWindowPause(window);
      if (ex) exceptions.push(ex);
    });

    return exceptions;
  }

  private createException(
    recordId: string,
    type: ExceptionType,
    severity: ExceptionSeverity,
    description: string,
    originalJudgment: string
  ): Exception {
    return {
      id: generateId(),
      recordId,
      type,
      severity,
      status: 'pending',
      description,
      createdAt: new Date(),
      originalJudgment,
    };
  }

  getExceptionTypeLabel(type: ExceptionType): string {
    const labels: Record<ExceptionType, string> = {
      missed_appointment: '预约爽约',
      abnormal_duration: '时长异常',
      window_pause: '窗口临停',
    };
    return labels[type];
  }

  getExceptionStatusLabel(status: ExceptionStatus): string {
    const labels: Record<ExceptionStatus, string> = {
      pending: '待确认',
      confirmed: '已确认',
      resolved: '已处理',
    };
    return labels[status];
  }

  getExceptionSeverityLabel(severity: ExceptionSeverity): string {
    const labels: Record<ExceptionSeverity, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return labels[severity];
  }
}

export const exceptionEngine = new ExceptionEngine();
