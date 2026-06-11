import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import dayjs from 'dayjs';
import type {
  RenewalAlert,
  OperationLog,
  AlertFilters,
  TimelineEvent,
  Student,
  CoursePackage,
  LeaveRecord,
  Evaluation,
} from '../types';
import {
  mockAlerts,
  mockLogs,
  mockStudents,
  mockPackages,
  mockLeaves,
  mockEvaluations,
} from '../data/mockData';

interface AppState {
  students: Student[];
  packages: CoursePackage[];
  leaves: LeaveRecord[];
  evaluations: Evaluation[];
  alerts: RenewalAlert[];
  logs: OperationLog[];
  filters: AlertFilters;
  currentAlert: RenewalAlert | null;
  timelineEvents: TimelineEvent[];
  setFilters: (filters: AlertFilters) => void;
  setCurrentAlert: (alert: RenewalAlert | null) => void;
  updateAlert: (id: string, data: Partial<RenewalAlert>) => void;
  loadTimelineEvents: (studentId: string) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'operateTime' | 'ip'>) => void;
  getFilteredAlerts: () => RenewalAlert[];
}

export const buildTimelineEvents = (
  studentId: string,
  students: Student[],
  packages: CoursePackage[],
  leaves: LeaveRecord[],
  evaluations: Evaluation[]
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const student = students.find((s) => s.id === studentId);
  const pkg = packages.find((p) => p.studentId === studentId);
  const studentLeaves = leaves.filter((l) => l.studentId === studentId);
  const evals = evaluations.filter((e) => e.studentId === studentId);

  if (student) {
    events.push({
      id: `enroll-${studentId}`,
      date: student.enrollDate,
      type: 'package',
      title: '入学报名',
      description: `${student.courseType}课程 - ${student.teacher}`,
      status: 'info',
    });
  }

  if (pkg) {
    events.push({
      id: `pkg-${pkg.id}`,
      date: pkg.purchaseDate,
      type: 'package',
      title: '购买课包',
      description: `${pkg.packageName}（共${pkg.totalHours}课时）`,
      status: 'normal',
    });

    if (pkg.freezeRecords) {
      pkg.freezeRecords.forEach((f) => {
        events.push({
          id: `freeze-${f.id}`,
          date: f.startDate,
          type: 'freeze',
          title: '课包冻结',
          description: `原因：${f.reason}，操作人：${f.operator}`,
          status: 'warning',
        });
      });
    }
  }

  studentLeaves.forEach((l) => {
    events.push({
      id: `leave-${l.id}`,
      date: l.leaveDate,
      type: 'leave',
      title: '请假申请',
      description: `${l.reason}（${l.hours}课时）- ${
        l.status === 'approved' ? '已批准' : l.status === 'pending' ? '待审批' : '已拒绝'
      }`,
      status: l.status === 'approved' ? 'warning' : l.status === 'pending' ? 'info' : 'danger',
    });

    if (l.makeUpClass) {
      events.push({
        id: `makeup-${l.makeUpClass.id}`,
        date: l.makeUpClass.scheduledDate,
        type: 'makeup',
        title: '补课安排',
        description: `${l.makeUpClass.teacher} - ${
          l.makeUpClass.status === 'completed' ? '已完成' : '已预约'
        }`,
        status: l.makeUpClass.status === 'completed' ? 'normal' : 'info',
      });
    }
  });

  evals.forEach((e) => {
    events.push({
      id: `eval-${e.id}`,
      date: e.evalDate || dayjs().format('YYYY-MM-DD'),
      type: 'evaluation',
      title:
        e.status === 'completed' ? '月度测评' : e.status === 'missing' ? '测评缺失' : '待测评',
      description:
        e.status === 'completed' ? `得分：${e.score}分 - ${e.comment}` : '未按时完成测评',
      status:
        e.status === 'completed' ? 'normal' : e.status === 'missing' ? 'danger' : 'warning',
    });
  });

  return events.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        students: mockStudents,
        packages: mockPackages,
        leaves: mockLeaves,
        evaluations: mockEvaluations,
        alerts: mockAlerts,
        logs: mockLogs,
        filters: {},
        currentAlert: null,
        timelineEvents: [],

        setFilters: (filters) => set({ filters }),

        setCurrentAlert: (alert) => set({ currentAlert: alert }),

        updateAlert: (id, data) =>
          set((state) => {
            const updatedAlerts = state.alerts.map((a) =>
              a.id === id ? { ...a, ...data } : a
            );
            return { alerts: updatedAlerts };
          }),

        loadTimelineEvents: (studentId) => {
          const { students, packages, leaves, evaluations } = get();
          const events = buildTimelineEvents(studentId, students, packages, leaves, evaluations);
          set({ timelineEvents: events });
        },

        addLog: (log) =>
          set((state) => {
            const newLog: OperationLog = {
              ...log,
              id: `log${Date.now()}`,
              operateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
              ip: '127.0.0.1',
            };
            return { logs: [newLog, ...state.logs] };
          }),

        getFilteredAlerts: () => {
          const { alerts, filters } = get();
          return alerts.filter((alert) => {
            if (filters.riskLevel && alert.riskLevel !== filters.riskLevel) return false;
            if (filters.processStatus && alert.processStatus !== filters.processStatus) return false;
            if (filters.hasConflict !== undefined && alert.hasConflict !== filters.hasConflict)
              return false;
            if (filters.courseType && alert.student.courseType !== filters.courseType)
              return false;
            if (filters.keyword) {
              const keyword = filters.keyword.toLowerCase();
              const matchName = alert.student.name.toLowerCase().includes(keyword);
              const matchCourse = alert.student.courseType.toLowerCase().includes(keyword);
              const matchTeacher = alert.student.teacher.toLowerCase().includes(keyword);
              if (!matchName && !matchCourse && !matchTeacher) return false;
            }
            return true;
          });
        },
      }),
      {
        name: 'renewal-app-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          students: state.students,
          packages: state.packages,
          leaves: state.leaves,
          evaluations: state.evaluations,
          alerts: state.alerts,
          logs: state.logs,
        }),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(persistedState as Partial<AppState>),
          filters: {},
          currentAlert: null,
          timelineEvents: [],
        }),
      }
    )
  )
);
