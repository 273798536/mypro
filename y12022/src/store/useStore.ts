import { create } from 'zustand';
import * as XLSX from 'xlsx';
import {
  CoursePack,
  Attendance,
  SubstituteRecord,
  LeaveRecord,
  FreezeRecord,
  AuditLog,
  RevenueRecognition,
  TraceNode,
  EntityType,
  ActionType,
} from '../types';
import {
  coursePacks as initialCoursePacks,
  attendances as initialAttendances,
  substituteRecords as initialSubstitutes,
  leaveRecords as initialLeaves,
  freezeRecords as initialFreezes,
  auditLogs as initialLogs,
  revenueRecognitions as initialRevenues,
} from '../data/mockData';

interface AppState {
  coursePacks: CoursePack[];
  attendances: Attendance[];
  substituteRecords: SubstituteRecord[];
  leaveRecords: LeaveRecord[];
  freezeRecords: FreezeRecord[];
  auditLogs: AuditLog[];
  revenues: RevenueRecognition[];
  selectedCoursePackId: string | null;
  selectedAttendanceId: string | null;
  traceModalOpen: boolean;
  filterStudent: string;
  filterTeacher: string;
  filterStatus: string;

  setSelectedCoursePackId: (id: string | null) => void;
  setSelectedAttendanceId: (id: string | null) => void;
  setTraceModalOpen: (open: boolean) => void;
  setFilterStudent: (name: string) => void;
  setFilterTeacher: (name: string) => void;
  setFilterStatus: (status: string) => void;

  logChange: (
    entityType: EntityType,
    entityId: string,
    action: ActionType,
    beforeValue: Record<string, unknown> | null,
    afterValue: Record<string, unknown> | null,
    source: string,
    operator: string
  ) => void;

  confirmAttendance: (attendanceId: string, operator: string) => void;
  recordSubstitute: (data: Omit<SubstituteRecord, 'id' | 'createdAt'>) => void;
  recordLeave: (data: Omit<LeaveRecord, 'id' | 'createdAt'>) => void;
  freezeCoursePack: (data: Omit<FreezeRecord, 'id'>) => void;
  unfreezeCoursePack: (coursePackId: string, operator: string) => void;

  getTraceChain: (attendanceId: string) => TraceNode[];
  calculateDeferredRevenue: (coursePackId: string) => number;
  getRevenueByPeriod: (period: string) => number;
  getLogsByEntity: (entityType: EntityType, entityId: string) => AuditLog[];

  exportData: (type: 'schedule' | 'attendance' | 'audit') => { blob: Blob; filename: string };
  exportToJSON: () => { blob: Blob; filename: string };
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useStore = create<AppState>((set, get) => ({
  coursePacks: initialCoursePacks,
  attendances: initialAttendances,
  substituteRecords: initialSubstitutes,
  leaveRecords: initialLeaves,
  freezeRecords: initialFreezes,
  auditLogs: initialLogs,
  revenues: initialRevenues,
  selectedCoursePackId: null,
  selectedAttendanceId: null,
  traceModalOpen: false,
  filterStudent: '',
  filterTeacher: '',
  filterStatus: '',

  setSelectedCoursePackId: (id) => set({ selectedCoursePackId: id }),
  setSelectedAttendanceId: (id) => set({ selectedAttendanceId: id }),
  setTraceModalOpen: (open) => set({ traceModalOpen: open }),
  setFilterStudent: (name) => set({ filterStudent: name }),
  setFilterTeacher: (name) => set({ filterTeacher: name }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  logChange: (entityType, entityId, action, beforeValue, afterValue, source, operator) => {
    const newLog: AuditLog = {
      id: generateId(),
      entityType,
      entityId,
      action,
      beforeValue,
      afterValue,
      source,
      operator,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      auditLogs: [...state.auditLogs, newLog],
    }));
  },

  confirmAttendance: (attendanceId, operator) => {
    const state = get();
    const attendance = state.attendances.find((a) => a.id === attendanceId);
    if (!attendance || attendance.confirmed) return;

    const coursePack = state.coursePacks.find((cp) => cp.id === attendance.coursePackId);
    if (!coursePack) return;

    const beforeAttendance = { status: attendance.status, confirmed: attendance.confirmed };
    const beforeCoursePack = { usedHours: coursePack.usedHours };

    set((state) => ({
      attendances: state.attendances.map((a) =>
        a.id === attendanceId
          ? {
              ...a,
              status: 'confirmed',
              confirmed: true,
              confirmedAt: new Date().toISOString(),
              confirmedBy: operator,
            }
          : a
      ),
      coursePacks: state.coursePacks.map((cp) =>
        cp.id === attendance.coursePackId
          ? { ...cp, usedHours: cp.usedHours + 1 }
          : cp
      ),
    }));

    get().logChange(
      'attendance',
      attendanceId,
      'confirm',
      beforeAttendance,
      { status: 'confirmed', confirmed: true, usedHours: 1 },
      '课消确认',
      operator
    );

    get().logChange(
      'coursePack',
      attendance.coursePackId,
      'update',
      beforeCoursePack,
      { usedHours: coursePack.usedHours + 1 },
      '课消确认',
      operator
    );

    const revenueAmount = coursePack.unitPrice;
    const period = new Date().toISOString().slice(0, 7);
    const newRevenue: RevenueRecognition = {
      id: generateId(),
      coursePackId: attendance.coursePackId,
      attendanceId,
      amount: revenueAmount,
      recognizedDate: new Date().toISOString().slice(0, 10),
      period,
    };

    set((state) => ({
      revenues: [...state.revenues, newRevenue],
    }));

    get().logChange(
      'revenue',
      newRevenue.id,
      'create',
      null,
      { amount: revenueAmount, period },
      '收入确认',
      '系统自动'
    );
  },

  recordSubstitute: (data) => {
    const newSubstitute: SubstituteRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      substituteRecords: [...state.substituteRecords, newSubstitute],
      attendances: state.attendances.map((a) =>
        a.id === data.attendanceId
          ? {
              ...a,
              teacherId: data.substituteTeacherId,
              teacherName: data.substituteTeacherName,
              hasSubstitute: true,
            }
          : a
      ),
    }));

    get().logChange(
      'substitute',
      newSubstitute.id,
      'create',
      null,
      {
        originalTeacherName: data.originalTeacherName,
        substituteTeacherName: data.substituteTeacherName,
        reason: data.reason,
      },
      '代课安排',
      '教务人员'
    );

    get().logChange(
      'attendance',
      data.attendanceId,
      'update',
      { teacherName: data.originalTeacherName },
      { teacherName: data.substituteTeacherName, hasSubstitute: true },
      '代课安排',
      '教务人员'
    );
  },

  recordLeave: (data) => {
    const newLeave: LeaveRecord = {
      ...data,
      id: generateId(),
      madeUp: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      leaveRecords: [...state.leaveRecords, newLeave],
      attendances: state.attendances.map((a) =>
        a.id === data.attendanceId
          ? { ...a, status: 'leave', hasLeave: true }
          : a
      ),
    }));

    get().logChange(
      'leave',
      newLeave.id,
      'create',
      null,
      { reason: data.reason, makeupDate: data.makeupDate },
      '请假申请',
      '学员家长'
    );

    get().logChange(
      'attendance',
      data.attendanceId,
      'update',
      { status: 'scheduled' },
      { status: 'leave', hasLeave: true },
      '请假申请',
      '学员家长'
    );
  },

  freezeCoursePack: (data) => {
    const newFreeze: FreezeRecord = {
      ...data,
      id: generateId(),
    };

    set((state) => ({
      freezeRecords: [...state.freezeRecords, newFreeze],
      coursePacks: state.coursePacks.map((cp) =>
        cp.id === data.coursePackId ? { ...cp, status: 'frozen' } : cp
      ),
    }));

    get().logChange(
      'freeze',
      newFreeze.id,
      'create',
      null,
      { reason: data.reason },
      '课包冻结',
      '教务人员'
    );

    get().logChange(
      'coursePack',
      data.coursePackId,
      'update',
      { status: 'active' },
      { status: 'frozen' },
      '课包冻结',
      '教务人员'
    );
  },

  unfreezeCoursePack: (coursePackId, operator) => {
    set((state) => ({
      freezeRecords: state.freezeRecords.map((fr) =>
        fr.coursePackId === coursePackId && !fr.unfreezeDate
          ? { ...fr, unfreezeDate: new Date().toISOString().slice(0, 10) }
          : fr
      ),
      coursePacks: state.coursePacks.map((cp) =>
        cp.id === coursePackId ? { ...cp, status: 'active' } : cp
      ),
    }));

    get().logChange(
      'coursePack',
      coursePackId,
      'update',
      { status: 'frozen' },
      { status: 'active' },
      '课包解冻',
      operator
    );
  },

  getTraceChain: (attendanceId) => {
    const state = get();
    const attendance = state.attendances.find((a) => a.id === attendanceId);
    if (!attendance) return [];

    const coursePack = state.coursePacks.find((cp) => cp.id === attendance.coursePackId);
    const substitute = state.substituteRecords.find((s) => s.attendanceId === attendanceId);
    const leave = state.leaveRecords.find((l) => l.attendanceId === attendanceId);
    const revenue = state.revenues.find((r) => r.attendanceId === attendanceId);
    const logs = state.auditLogs.filter((log) => log.entityId === attendanceId);

    const chain: TraceNode[] = [];

    if (coursePack) {
      chain.push({
        id: coursePack.id,
        type: 'coursePack',
        title: `课包购买 - ${coursePack.studentName}`,
        description: `${coursePack.totalHours}课时，单价¥${coursePack.unitPrice}`,
        timestamp: coursePack.createdAt,
        operator: '销售-小陈',
        details: {
          totalHours: coursePack.totalHours,
          usedHours: coursePack.usedHours,
          unitPrice: coursePack.unitPrice,
        },
      });
    }

    chain.push({
      id: attendance.id,
      type: 'attendance',
      title: '排课安排',
      description: `${attendance.date}，${attendance.teacherName}`,
      timestamp: attendance.date + 'T00:00:00Z',
      operator: '教务人员',
      details: {
        date: attendance.date,
        teacher: attendance.teacherName,
        status: attendance.status,
      },
    });

    if (substitute) {
      chain.push({
        id: substitute.id,
        type: 'substitute',
        title: '老师代课',
        description: `${substitute.originalTeacherName} → ${substitute.substituteTeacherName}`,
        timestamp: substitute.createdAt,
        operator: '教务人员',
        details: {
          originalTeacher: substitute.originalTeacherName,
          substituteTeacher: substitute.substituteTeacherName,
          reason: substitute.reason,
        },
      });
    }

    if (leave) {
      chain.push({
        id: leave.id,
        type: 'leave',
        title: '学员请假',
        description: `原因：${leave.reason}${leave.makeupDate ? `，补课：${leave.makeupDate}` : ''}`,
        timestamp: leave.createdAt,
        operator: '学员家长',
        details: {
          reason: leave.reason,
          makeupDate: leave.makeupDate,
          madeUp: leave.madeUp,
        },
      });
    }

    if (attendance.isMakeup && attendance.originalAttendanceId) {
      chain.push({
        id: `makeup-${attendance.id}`,
        type: 'attendance',
        title: '补课签到',
        description: '原请假课程的补课安排',
        timestamp: attendance.date + 'T00:00:00Z',
        operator: '教务人员',
        details: {
          originalAttendanceId: attendance.originalAttendanceId,
          date: attendance.date,
        },
      });
    }

    if (attendance.confirmed) {
      chain.push({
        id: `confirm-${attendance.id}`,
        type: 'attendance',
        title: '课消确认',
        description: `确认人：${attendance.confirmedBy}`,
        timestamp: attendance.confirmedAt || '',
        operator: attendance.confirmedBy || '',
        details: {
          confirmed: true,
          confirmedAt: attendance.confirmedAt,
          confirmedBy: attendance.confirmedBy,
        },
      });
    }

    if (revenue) {
      chain.push({
        id: revenue.id,
        type: 'revenue',
        title: '收入确认',
        description: `确认收入 ¥${revenue.amount}，归属期：${revenue.period}`,
        timestamp: revenue.recognizedDate + 'T00:00:00Z',
        operator: '系统自动',
        details: {
          amount: revenue.amount,
          period: revenue.period,
          recognizedDate: revenue.recognizedDate,
        },
      });
    }

    return chain.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  calculateDeferredRevenue: (coursePackId) => {
    const state = get();
    const coursePack = state.coursePacks.find((cp) => cp.id === coursePackId);
    if (!coursePack) return 0;

    const remainingHours = coursePack.totalHours - coursePack.usedHours;
    return remainingHours * coursePack.unitPrice;
  },

  getRevenueByPeriod: (period) => {
    const state = get();
    return state.revenues
      .filter((r) => r.period === period)
      .reduce((sum, r) => sum + r.amount, 0);
  },

  getLogsByEntity: (entityType, entityId) => {
    const state = get();
    return state.auditLogs.filter(
      (log) => log.entityType === entityType && log.entityId === entityId
    );
  },

  exportData: (type) => {
    const state = get();
    let data: Record<string, unknown>[] = [];
    let filename = '';

    switch (type) {
      case 'schedule': {
        filename = '排课结论表.xlsx';
        data = state.attendances.map((a) => {
          const cp = state.coursePacks.find((c) => c.id === a.coursePackId);
          const sub = state.substituteRecords.find((s) => s.attendanceId === a.id);
          const leave = state.leaveRecords.find((l) => l.attendanceId === a.id);
          return {
            日期: a.date,
            学员: cp?.studentName || '',
            授课老师: a.teacherName,
            是否代课: a.hasSubstitute ? '是' : '否',
            原老师: sub?.originalTeacherName || '',
            是否请假: a.hasLeave ? '是' : '否',
            请假原因: leave?.reason || '',
            签到状态: a.status,
            是否已确认: a.confirmed ? '是' : '否',
            确认人: a.confirmedBy || '',
          };
        });
        break;
      }
      case 'attendance': {
        filename = '课消明细表.xlsx';
        data = state.attendances
          .filter((a) => a.confirmed)
          .map((a) => {
            const cp = state.coursePacks.find((c) => c.id === a.coursePackId);
            const rev = state.revenues.find((r) => r.attendanceId === a.id);
            return {
              日期: a.date,
              学员: cp?.studentName || '',
              老师: a.teacherName,
              课消课时: 1,
              课时单价: cp?.unitPrice || 0,
              确认收入: rev?.amount || 0,
              归属期: rev?.period || '',
              确认人: a.confirmedBy || '',
              确认时间: a.confirmedAt || '',
            };
          });
        break;
      }
      case 'audit': {
        filename = '审计日志表.xlsx';
        data = state.auditLogs.map((log) => ({
          时间: log.timestamp,
          操作类型: log.action,
          实体类型: log.entityType,
          来源: log.source,
          操作人: log.operator,
          变更前: JSON.stringify(log.beforeValue || {}),
          变更后: JSON.stringify(log.afterValue || {}),
        }));
        break;
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return { blob, filename };
  },

  exportToJSON: () => {
    const state = get();
    const data = {
      coursePacks: state.coursePacks,
      attendances: state.attendances,
      substituteRecords: state.substituteRecords,
      leaveRecords: state.leaveRecords,
      freezeRecords: state.freezeRecords,
      auditLogs: state.auditLogs,
      revenues: state.revenues,
      exportTime: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    return { blob, filename: '课消系统数据.json' };
  },
}));
