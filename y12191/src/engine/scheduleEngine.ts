import type { 
  Volunteer, 
  Position, 
  TrainingRecord, 
  Assignment, 
  CheckResult,
  CheckIssue,
  Snapshot,
  ComparisonResult,
  ComparisonDiff,
  SnapshotPhase,
  Notification
} from '../types';
import { getEnabledCheckRules, classifySampleType } from './checkRules';
import { generateIdempotencyKey } from './idempotency';

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function stableSort<T>(arr: T[], keyFn: (item: T) => string): T[] {
  return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function compareValues(a: unknown, b: unknown): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => compareValues(val, b[idx]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => 
      compareValues((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }
  return a === b;
}

export function runScheduleCheck(
  volunteers: Volunteer[],
  positions: Position[],
  trainingRecords: TrainingRecord[],
  assignments: Assignment[],
  options?: { phase?: SnapshotPhase; description?: string }
): { checkResults: CheckResult[]; assignments: Assignment[] } {
  const sortedAssignments = stableSort(assignments, a => a.id);
  const sortedVolunteers = stableSort(volunteers, v => v.id);
  const sortedPositions = stableSort(positions, p => p.id);
  const sortedTraining = stableSort(trainingRecords, t => t.id);
  
  const checkResults: CheckResult[] = [];
  const processedAssignments: Assignment[] = deepClone(sortedAssignments);
  
  sortedAssignments.forEach(assignment => {
    const volunteer = sortedVolunteers.find(v => v.id === assignment.volunteerId);
    const position = sortedPositions.find(p => p.id === assignment.positionId);
    
    if (!volunteer || !position) return;
    
    const issues: CheckIssue[] = [];
    const rules = getEnabledCheckRules();
    
    rules.forEach(rule => {
      const issue = rule.check(
        assignment,
        volunteer,
        position,
        {
          allAssignments: sortedAssignments,
          trainingRecords: sortedTraining,
          allVolunteers: sortedVolunteers,
          allPositions: sortedPositions
        }
      );
      if (issue) {
        issues.push(issue);
      }
    });
    
    const sampleType = classifySampleType(issues);
    
    let finalStatus: Assignment['status'] = assignment.status;
    let finalReason = assignment.reason;
    
    if (sampleType === 'bad') {
      finalStatus = 'rejected';
      const errorIssues = issues.filter(i => i.severity === 'error');
      finalReason = errorIssues.map(i => i.message).join('; ');
    } else if (sampleType === 'boundary') {
      const warningIssues = issues.filter(i => i.severity === 'warning');
      finalReason = finalReason || warningIssues.map(i => i.message).join('; ');
    }
    
    const processedAssignment: Assignment = {
      ...assignment,
      status: finalStatus,
      reason: finalReason
    };
    
    const checkResult: CheckResult = {
      id: generateId(),
      assignment: processedAssignment,
      volunteer,
      position,
      sampleType,
      issues,
      checkedAt: new Date().toISOString()
    };
    
    checkResults.push(checkResult);
    processedAssignments.push(processedAssignment);
  });
  
  return { checkResults, assignments: processedAssignments };
}

export function createSnapshot(
  volunteers: Volunteer[],
  positions: Position[],
  trainingRecords: TrainingRecord[],
  assignments: Assignment[],
  checkResults: CheckResult[],
  phase: SnapshotPhase,
  description: string
): Snapshot {
  const idempotencyKey = generateIdempotencyKey({
    volunteers,
    positions,
    trainingRecords,
    assignments
  });
  
  const now = new Date().toISOString();
  return {
    id: generateId(),
    timestamp: now,
    createdAt: now,
    phase,
    description,
    volunteers: deepClone(volunteers),
    positions: deepClone(positions),
    trainingRecords: deepClone(trainingRecords),
    assignments: deepClone(assignments),
    checkResults: deepClone(checkResults),
    idempotencyKey,
    metadata: {
      checkRulesVersion: '1.0',
      generatedAt: new Date().toISOString()
    }
  };
}

export function compareSnapshots(
  before: Snapshot,
  after: Snapshot
): ComparisonResult {
  const differences: ComparisonDiff[] = [];
  const beforeMap = new Map(before.checkResults.map(r => [r.assignment.id, r]));
  const afterMap = new Map(after.checkResults.map(r => [r.assignment.id, r]));
  
  const allIds = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  
  let newAssignments = 0;
  let removedAssignments = 0;
  let statusChanges = 0;
  let sampleTypeChanges = 0;
  
  allIds.forEach(assignmentId => {
    const beforeResult = beforeMap.get(assignmentId);
    const afterResult = afterMap.get(assignmentId);
    
    if (!beforeResult && afterResult) {
      const volunteerName = afterResult.volunteer.name;
      const positionName = afterResult.position.name;
      
      if (beforeResult.assignment.status !== afterResult.assignment.status) {
        statusChanges++;
        differences.push({
          assignmentId,
          volunteerName,
          positionName,
          field: 'status',
          before: beforeResult.assignment.status,
          after: afterResult.assignment.status,
          changeType: 'modified',
          impact: 'high'
        });
      }
      
      if (beforeResult.sampleType !== afterResult.sampleType) {
        sampleTypeChanges++;
        differences.push({
          assignmentId,
          volunteerName,
          positionName,
          field: 'sampleType',
          before: beforeResult.sampleType,
          after: afterResult.sampleType,
          changeType: 'modified',
          impact: 'high'
        });
      }
      
      if (!compareValues(beforeResult.issues, afterResult.issues)) {
        differences.push({
          assignmentId,
          volunteerName,
          positionName,
          field: 'issues',
          before: beforeResult.issues,
          after: afterResult.issues,
          changeType: 'modified',
          impact: 'medium'
        });
      }
    } else if (!beforeResult && afterResult) {
      newAssignments++;
      differences.push({
        assignmentId,
        volunteerName: afterResult.volunteer.name,
        positionName: afterResult.position.name,
        field: 'assignment',
        before: null,
        after: afterResult.assignment,
        changeType: 'added',
        impact: 'high'
      });
    } else if (beforeResult && !afterResult) {
      removedAssignments++;
      differences.push({
        assignmentId,
        volunteerName: beforeResult.volunteer.name,
        positionName: beforeResult.position.name,
        field: 'assignment',
        before: beforeResult.assignment,
        after: null,
        changeType: 'removed',
        impact: 'high'
      });
    }
  });
  
  return {
    snapshotBeforeId: before.id,
    snapshotAfterId: after.id,
    summary: {
      totalChanges: differences.length,
      newAssignments,
      removedAssignments,
      statusChanges,
      sampleTypeChanges
    },
    differences
  };
}

export function rescheduleBackup(
  checkResults: CheckResult[],
  volunteers: Volunteer[],
  positions: Position[],
  trainingRecords: TrainingRecord[]
): { newAssignments: Assignment[]; notifications: Omit<Notification, 'id' | 'sentAt'>[] } {
  const newAssignments: Assignment[] = [];
  const notifications: Omit<Notification, 'id' | 'sentAt'>[] = [];
  
  const rejectedVolunteerIds = new Set(
    checkResults
      .filter(r => r.assignment.status === 'rejected')
      .map(r => r.volunteer.id)
  );
  
  const positionFilledCount: Record<string, number> = {};
  
  checkResults
    .filter(r => r.assignment.status === 'assigned')
    .forEach(r => {
      positionFilledCount[r.position.id] = (positionFilledCount[r.position.id] || 0) + 1;
    });
  
  positions.forEach(position => {
    const filled = positionFilledCount[position.id] || 0;
    const needed = position.capacity - filled;
    
    if (needed > 0) {
      const availableVolunteers = volunteers.filter(v => {
        if (rejectedVolunteerIds.has(v.id)) return false;
        if (v.isOnLeave && v.leaveSlots?.includes(position.timeSlot)) return false;
        
        const hasSkills = position.requiredSkills.every(s => v.skills.includes(s));
        const hasTime = v.availableSlots.includes(position.timeSlot) || v.availableSlots.includes('全天');
        
        const hasTraining = position.requiredTraining.every(t => {
          const record = trainingRecords.find(
            r => r.volunteerId === v.id && r.trainingName === t && r.status === 'passed'
          );
          return !!record;
        });
        
        return hasSkills && hasTime && hasTraining;
      });
      
      availableVolunteers.slice(0, needed).forEach((volunteer, idx) => {
        const backupAssignment: Assignment = {
          id: generateId(),
          volunteerId: volunteer.id,
          positionId: position.id,
          timeSlot: position.timeSlot,
          status: 'backup',
          isBackup: true,
          backupPriority: idx + 1,
          reason: '候补调度'
        };
        
        newAssignments.push(backupAssignment);
        
        notifications.push({
          volunteerId: volunteer.id,
          volunteerName: volunteer.name,
          recipientName: volunteer.name,
          type: 'backup_assigned',
          title: '候补调度通知',
          content: `由于原有志愿者排班出现问题，您已被调整为【${position.name}】的候补志愿者`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: backupAssignment.id
        });
      });
    }
  });
  
  return { newAssignments, notifications };
}

export function classifyCheckResults(checkResults: CheckResult[]): {
  normal: CheckResult[]; boundary: CheckResult[]; bad: CheckResult[] } {
  const sorted = stableSort(checkResults, r => r.id);
  
  return {
    normal: sorted.filter(r => r.sampleType === 'normal'),
    boundary: sorted.filter(r => r.sampleType === 'boundary'),
    bad: sorted.filter(r => r.sampleType === 'bad')
  };
}
