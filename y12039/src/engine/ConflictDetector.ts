import type { Task, Staff, Alert } from '../types/game';

export function detectConflicts(tasks: Task[], staff: Staff[], currentTime: number): Alert[] {
  const alerts: Alert[] = [];
  const staffTaskMap = new Map<string, string[]>();

  tasks.forEach(task => {
    if (task.status === 'in_progress') {
      task.assignedStaff.forEach(staffId => {
        if (!staffTaskMap.has(staffId)) {
          staffTaskMap.set(staffId, []);
        }
        staffTaskMap.get(staffId)!.push(task.id);
      });
    }
  });

  staffTaskMap.forEach((taskIds, staffId) => {
    if (taskIds.length > 1) {
      const staffMember = staff.find(s => s.id === staffId);
      alerts.push({
        id: `conflict-staff-${currentTime}-${staffId}`,
        type: 'conflict',
        severity: 'critical',
        message: `${staffMember?.name || '人员'}被同时分配到${taskIds.length}个任务`,
        timestamp: currentTime,
        penalty: 50 * (taskIds.length - 1),
        relatedStaffId: staffId
      });
    }
  });

  const moduleTaskMap = new Map<string, string[]>();
  tasks.forEach(task => {
    if (task.status === 'in_progress') {
      if (!moduleTaskMap.has(task.moduleId)) {
        moduleTaskMap.set(task.moduleId, []);
      }
      moduleTaskMap.get(task.moduleId)!.push(task.id);
    }
  });

  moduleTaskMap.forEach((taskIds, moduleId) => {
    if (taskIds.length > 1) {
      alerts.push({
        id: `conflict-module-${currentTime}-${moduleId}`,
        type: 'conflict',
        severity: 'warning',
        message: `舱段同时进行${taskIds.length}个维修任务，效率降低30%`,
        timestamp: currentTime,
        penalty: 30 * (taskIds.length - 1),
        relatedModuleId: moduleId
      });
    }
  });

  return alerts;
}

export function checkTaskDeadlines(tasks: Task[], currentTime: number): Alert[] {
  const alerts: Alert[] = [];

  tasks.forEach(task => {
    if (task.status === 'pending' || task.status === 'in_progress') {
      const timeRemaining = task.deadline - currentTime;
      if (timeRemaining <= 0) {
        alerts.push({
          id: `timeout-${currentTime}-${task.id}`,
          type: 'timeout',
          severity: 'critical',
          message: `任务"${task.name}"已超时失败`,
          timestamp: currentTime,
          penalty: 100,
          relatedTaskId: task.id
        });
      } else if (timeRemaining <= 30 && timeRemaining > 0) {
        alerts.push({
          id: `timeout-warning-${currentTime}-${task.id}`,
          type: 'timeout',
          severity: 'warning',
          message: `任务"${task.name}"即将超时，剩余${Math.ceil(timeRemaining)}秒`,
          timestamp: currentTime,
          penalty: 0,
          relatedTaskId: task.id
        });
      }
    }
  });

  return alerts;
}

export function checkStaffFatigue(staff: Staff[], currentTime: number): Alert[] {
  const alerts: Alert[] = [];

  staff.forEach(s => {
    const fatiguePercent = (s.fatigue / s.maxFatigue) * 100;
    if (fatiguePercent >= 90 && s.status !== 'exhausted') {
      alerts.push({
        id: `fatigue-critical-${currentTime}-${s.id}`,
        type: 'fatigue',
        severity: 'critical',
        message: `${s.name}极度疲劳！工作效率下降50%`,
        timestamp: currentTime,
        penalty: 40,
        relatedStaffId: s.id
      });
    } else if (fatiguePercent >= 70 && fatiguePercent < 90) {
      alerts.push({
        id: `fatigue-warning-${currentTime}-${s.id}`,
        type: 'fatigue',
        severity: 'warning',
        message: `${s.name}疲劳度较高，建议安排休息`,
        timestamp: currentTime,
        penalty: 0,
        relatedStaffId: s.id
      });
    }
  });

  return alerts;
}
