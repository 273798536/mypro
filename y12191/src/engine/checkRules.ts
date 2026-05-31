import type { CheckRule, CheckIssue, Assignment, Volunteer, Position, TrainingRecord } from '../types';

function checkTrainingExpiring(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiryDate.getTime() - now.getTime() < thirtyDays;
}

export const checkRules: CheckRule[] = [
  {
    id: 'conflict',
    name: '岗位冲突检查',
    description: '检查同一志愿者在同一时段是否被分配到多个岗位',
    enabled: true,
    severity: 'error',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position,
      context: { allAssignments: Assignment[] }
    ): CheckIssue | null => {
      const sameSlotAssignments = context.allAssignments.filter(
        a => a.volunteerId === assignment.volunteerId &&
             a.timeSlot === assignment.timeSlot &&
             a.id !== assignment.id &&
             a.status === 'assigned'
      );
      
      if (sameSlotAssignments.length > 0) {
        return {
          type: 'conflict',
          severity: 'error',
          message: '时段岗位冲突',
          details: `该志愿者在${position.timeSlot}时段已分配到其他岗位`
        };
      }
      return null;
    }
  },
  
  {
    id: 'training',
    name: '培训资质检查',
    description: '检查志愿者是否完成岗位要求的所有培训',
    enabled: true,
    severity: 'error',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position,
      context: { trainingRecords: TrainingRecord[] }
    ): CheckIssue | null => {
      const volunteerTrainings = context.trainingRecords.filter(
        r => r.volunteerId === volunteer.id && r.status === 'passed'
      ).map(r => r.trainingName);
      
      const missingTrainings = position.requiredTraining.filter(
        t => !volunteerTrainings.includes(t)
      );
      
      if (missingTrainings.length > 0) {
        return {
          type: 'missing_training',
          severity: 'error',
          message: '缺少必要培训',
          details: `缺少: ${missingTrainings.join('、')}`
        };
      }
      return null;
    }
  },
  
  {
    id: 'training_expiry',
    name: '培训有效期检查',
    description: '检查培训是否即将过期',
    enabled: true,
    severity: 'warning',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position,
      context: { trainingRecords: TrainingRecord[] }
    ): CheckIssue | null => {
      const relevantTrainings = context.trainingRecords.filter(
        r => r.volunteerId === volunteer.id && 
             position.requiredTraining.includes(r.trainingName) &&
             r.status === 'passed'
      );
      
      const expiringSoon = relevantTrainings.filter(r => checkTrainingExpiring(r.expiresAt));
      
      if (expiringSoon.length > 0) {
        return {
          type: 'training_expiring',
          severity: 'warning',
          message: '培训即将过期',
          details: `${expiringSoon.map(r => r.trainingName).join('、')} 将在30天内过期`
        };
      }
      return null;
    }
  },
  
  {
    id: 'leave',
    name: '请假检查',
    description: '检查志愿者是否在排班时段请假',
    enabled: true,
    severity: 'error',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position
    ): CheckIssue | null => {
      if (volunteer.isOnLeave) {
        if (volunteer.leaveSlots?.includes(position.timeSlot)) {
          return {
            type: 'leave',
            severity: 'error',
            message: '该时段志愿者已请假',
            details: `请假原因: ${volunteer.leaveReason || '未说明'}`
          };
        }
      }
      return null;
    }
  },
  
  {
    id: 'skill',
    name: '技能匹配检查',
    description: '检查志愿者是否具备岗位要求的技能',
    enabled: true,
    severity: 'error',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position
    ): CheckIssue | null => {
      const missingSkills = position.requiredSkills.filter(
        s => !volunteer.skills.includes(s)
      );
      
      if (missingSkills.length > 0) {
        return {
          type: 'skill',
          severity: 'error',
          message: '技能不匹配',
          details: `缺少技能: ${missingSkills.join('、')}`
        };
      }
      return null;
    }
  },
  
  {
    id: 'capacity',
    name: '岗位容量检查',
    description: '检查岗位分配人数是否超过容量限制',
    enabled: true,
    severity: 'warning',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position,
      context: { allAssignments: Assignment[] }
    ): CheckIssue | null => {
      const positionAssignments = context.allAssignments.filter(
        a => a.positionId === position.id && 
             a.status === 'assigned' &&
             a.id !== assignment.id
      );
      
      if (positionAssignments.length >= position.capacity) {
        return {
          type: 'capacity',
          severity: 'warning',
          message: '岗位容量超限',
          details: `已分配${positionAssignments.length}人，上限${position.capacity}人`
        };
      }
      return null;
    }
  },
  
  {
    id: 'availability',
    name: '可用时段检查',
    description: '检查排班时段是否在志愿者可用时段内',
    enabled: true,
    severity: 'warning',
    check: (
      assignment: Assignment,
      volunteer: Volunteer,
      position: Position
    ): CheckIssue | null => {
      const hasExactSlot = volunteer.availableSlots.includes(position.timeSlot);
      const hasAllDay = volunteer.availableSlots.includes('全天');
      
      if (!hasExactSlot && !hasAllDay) {
        return {
          type: 'availability',
          severity: 'warning',
          message: '时段不匹配',
          details: `志愿者可用时段: ${volunteer.availableSlots.join('、')}`
        };
      }
      return null;
    }
  }
];

export function getEnabledCheckRules(): CheckRule[] {
  return checkRules.filter(r => r.enabled);
}

export function classifySampleType(issues: CheckIssue[]): 'normal' | 'boundary' | 'bad' {
  if (issues.length === 0) {
    return 'normal';
  }
  
  const hasError = issues.some(i => i.severity === 'error');
  const hasWarning = issues.some(i => i.severity === 'warning');
  
  if (hasError) {
    return 'bad';
  } else if (hasWarning) {
    return 'boundary';
  }
  
  return 'normal';
}
