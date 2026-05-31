import { create } from 'zustand';
import type { 
  StoreState, 
  Volunteer, 
  Position, 
  TrainingRecord,
  Assignment,
  Snapshot,
  SnapshotPhase,
  CheckResult,
  BoundaryScenario
} from '../types';
import { 
  runScheduleCheck, 
  createSnapshot, 
  compareSnapshots,
  rescheduleBackup 
} from '../engine/scheduleEngine';
import { generateIdempotencyKey, runIdempotencyTest } from '../engine/idempotency';
import { boundaryScenarios } from '../data/boundaryScenarios';

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateNotificationsForChanges(
  before: CheckResult[],
  after: CheckResult[]
): Omit<import('../types').Notification, 'id' | 'sentAt'>[] {
  const notifications: Omit<import('../types').Notification, 'id' | 'sentAt'>[] = [];
  const beforeMap = new Map(before.map(r => [r.assignment.id, r]));
  
  after.forEach(afterResult => {
    const beforeResult = beforeMap.get(afterResult.assignment.id);
    
    if (!beforeResult) {
      if (afterResult.assignment.status === 'assigned') {
        notifications.push({
          volunteerId: afterResult.volunteer.id,
          volunteerName: afterResult.volunteer.name,
          recipientName: afterResult.volunteer.name,
          type: 'schedule_change',
          title: '新岗位分配通知',
          content: `您已被分配到【${afterResult.position.name}】岗位，时段：${afterResult.position.timeSlot}`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: afterResult.assignment.id
        });
      }
    } else if (beforeResult.assignment.status !== afterResult.assignment.status) {
      if (beforeResult.assignment.status === 'assigned' && afterResult.assignment.status === 'rejected') {
        notifications.push({
          volunteerId: afterResult.volunteer.id,
          volunteerName: afterResult.volunteer.name,
          recipientName: afterResult.volunteer.name,
          type: 'schedule_change',
          title: '排班取消通知',
          content: `抱歉，您的【${afterResult.position.name}】岗位分配已被取消，原因：${afterResult.assignment.reason}`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: afterResult.assignment.id
        });
      } else if (beforeResult.assignment.status === 'rejected' && afterResult.assignment.status === 'assigned') {
        notifications.push({
          volunteerId: afterResult.volunteer.id,
          volunteerName: afterResult.volunteer.name,
          recipientName: afterResult.volunteer.name,
          type: 'schedule_change',
          title: '排班恢复通知',
          content: `好消息！您的【${afterResult.position.name}】岗位分配已恢复`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: afterResult.assignment.id
        });
      } else if (afterResult.assignment.status === 'backup') {
        notifications.push({
          volunteerId: afterResult.volunteer.id,
          volunteerName: afterResult.volunteer.name,
          recipientName: afterResult.volunteer.name,
          type: 'backup_assigned',
          title: '候补调度通知',
          content: `您已被调整为【${afterResult.position.name}】的候补志愿者`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: afterResult.assignment.id
        });
      }
    } else if (beforeResult.sampleType !== afterResult.sampleType) {
      if (beforeResult.sampleType === 'bad' && afterResult.sampleType !== 'bad') {
        notifications.push({
          volunteerId: afterResult.volunteer.id,
          volunteerName: afterResult.volunteer.name,
          recipientName: afterResult.volunteer.name,
          type: 'schedule_change',
          title: '排班状态更新',
          content: `您的排班状态已更新，之前的问题已解决`,
          status: 'sent',
          isRead: false,
          relatedAssignmentId: afterResult.assignment.id
        });
      }
    }
  });
  
  return notifications;
}

export const useScheduleStore = create<StoreState>((set, get) => ({
  volunteers: [],
  positions: [],
  trainingRecords: [],
  assignments: [],
  checkResults: [],
  snapshots: [],
  notifications: [],
  currentPhase: 'idle',
  selectedSnapshotIds: [null, null],
  comparisonResult: null,
  isLoading: false,
  error: null,
  
  setVolunteers: (volunteers: Volunteer[]) => {
    set({ volunteers });
  },
  
  setPositions: (positions: Position[]) => {
    set({ positions });
  },
  
  setTrainingRecords: (records: TrainingRecord[]) => {
    set({ trainingRecords: records });
  },
  
  runScheduleCheck: async (phase: SnapshotPhase, description?: string) => {
    const state = get();
    set({ isLoading: true, error: null });
    
    try {
      const { checkResults, assignments } = runScheduleCheck(
        state.volunteers,
        state.positions,
        state.trainingRecords,
        state.assignments
      );
      
      const snapshot = createSnapshot(
        state.volunteers,
        state.positions,
        state.trainingRecords,
        assignments,
        checkResults,
        phase,
        description || `${phase === 'phase1' ? '第一阶段' : phase === 'phase2' ? '第二阶段' : '修正后'}检查`
      );
      
      const { newAssignments, notifications: backupNotifications } = rescheduleBackup(
        checkResults,
        state.volunteers,
        state.positions,
        state.trainingRecords
      );
      
      const changeNotifications = generateNotificationsForChanges(
        state.checkResults,
        checkResults
      );
      
      const allNotifications = [...changeNotifications, ...backupNotifications];
      const fullNotifications = allNotifications.map(n => ({
        ...n,
        id: generateId(),
        sentAt: new Date().toISOString(),
        snapshotId: snapshot.id
      }));
      
      const finalAssignments = [
        ...assignments.filter(a => !newAssignments.some(na => na.id === a.id)),
        ...newAssignments
      ];
      
      set({
        checkResults,
        assignments: finalAssignments,
        snapshots: [...state.snapshots, snapshot],
        currentPhase: phase === 'phase1' ? 'phase1' : phase === 'phase2' ? 'phase2' : 'comparing',
        notifications: [...state.notifications, ...fullNotifications],
        isLoading: false
      });
      
      return snapshot;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  compareSnapshots: (beforeId: string, afterId: string) => {
    const state = get();
    const before = state.snapshots.find(s => s.id === beforeId);
    const after = state.snapshots.find(s => s.id === afterId);
    
    if (!before || !after) {
      throw new Error('找不到指定的快照');
    }
    
    const result = compareSnapshots(before, after);
    set({ 
      comparisonResult: result,
      selectedSnapshotIds: [beforeId, afterId]
    });
    
    return result;
  },
  
  updatePosition: async (positionId: string, updates: Partial<Position>) => {
    const state = get();
    set({ isLoading: true, error: null });
    
    try {
      const updatedPositions = state.positions.map(p => 
        p.id === positionId ? { ...p, ...updates } : p
      );
      
      const { checkResults, assignments } = runScheduleCheck(
        state.volunteers,
        updatedPositions,
        state.trainingRecords,
        state.assignments
      );
      
      const snapshot = createSnapshot(
        state.volunteers,
        updatedPositions,
        state.trainingRecords,
        assignments,
        checkResults,
        'corrected',
        '手动修正后检查'
      );
      
      const { newAssignments, notifications: backupNotifications } = rescheduleBackup(
        checkResults,
        state.volunteers,
        updatedPositions,
        state.trainingRecords
      );
      
      const changeNotifications = generateNotificationsForChanges(
        state.checkResults,
        checkResults
      );
      
      const allNotifications = [...changeNotifications, ...backupNotifications];
      const fullNotifications = allNotifications.map(n => ({
        ...n,
        id: generateId(),
        sentAt: new Date().toISOString(),
        snapshotId: snapshot.id
      }));
      
      const finalAssignments = [
        ...assignments.filter(a => !newAssignments.some(na => na.id === a.id)),
        ...newAssignments
      ];
      
      set({
        positions: updatedPositions,
        checkResults,
        assignments: finalAssignments,
        snapshots: [...state.snapshots, snapshot],
        notifications: [...state.notifications, ...fullNotifications],
        isLoading: false
      });
      
      return snapshot;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  manualAssign: (volunteerId: string, positionId: string) => {
    const state = get();
    const volunteer = state.volunteers.find(v => v.id === volunteerId);
    const position = state.positions.find(p => p.id === positionId);
    
    if (!volunteer || !position) {
      set({ error: '找不到志愿者或岗位' });
      return null;
    }
    
    const newAssignment: Assignment = {
      id: generateId(),
      volunteerId,
      positionId,
      timeSlot: position.timeSlot,
      status: 'pending',
      reason: '手动分配'
    };
    
    const { checkResults, assignments } = runScheduleCheck(
      state.volunteers,
      state.positions,
      state.trainingRecords,
      [...state.assignments, newAssignment]
    );
    
    const result = checkResults.find(r => r.assignment.id === newAssignment.id);
    
    set({
      assignments,
      checkResults
    });
    
    return result || null;
  },
  
  generateBoundaryScenario: (scenarioId: string) => {
    const scenario = boundaryScenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error('找不到指定的边界场景');
    }
    return scenario;
  },
  
  runIdempotencyTest: () => {
    const state = get();
    
    const testFn = () => {
      const key = generateIdempotencyKey({
        volunteers: state.volunteers,
        positions: state.positions,
        trainingRecords: state.trainingRecords,
        assignments: state.assignments
      });
      
      const { checkResults } = runScheduleCheck(
        state.volunteers,
        state.positions,
        state.trainingRecords,
        state.assignments
      );
      
      return {
        key,
        count: checkResults.length,
        sampleCounts: {
          normal: checkResults.filter(r => r.sampleType === 'normal').length,
          boundary: checkResults.filter(r => r.sampleType === 'boundary').length,
          bad: checkResults.filter(r => r.sampleType === 'bad').length
        }
      };
    };
    
    return runIdempotencyTest(testFn, 3);
  },
  
  runScheduleCheckWithBackup: async () => {
    const state = get();
    set({ isLoading: true, error: null });
    
    try {
      const { checkResults, assignments } = runScheduleCheck(
        state.volunteers,
        state.positions,
        state.trainingRecords,
        state.assignments
      );
      
      const snapshot = createSnapshot(
        state.volunteers,
        state.positions,
        state.trainingRecords,
        assignments,
        checkResults,
        'corrected',
        '重新调度候补'
      );
      
      const { newAssignments, notifications: backupNotifications } = rescheduleBackup(
        checkResults,
        state.volunteers,
        state.positions,
        state.trainingRecords
      );
      
      const changeNotifications = generateNotificationsForChanges(
        state.checkResults,
        checkResults
      );
      
      const allNotifications = [...changeNotifications, ...backupNotifications];
      const fullNotifications = allNotifications.map(n => ({
        ...n,
        id: generateId(),
        sentAt: new Date().toISOString(),
        snapshotId: snapshot.id
      }));
      
      const finalAssignments = [
        ...assignments.filter(a => !newAssignments.some(na => na.id === a.id)),
        ...newAssignments
      ];
      
      set({
        checkResults,
        assignments: finalAssignments,
        snapshots: [...state.snapshots, snapshot],
        notifications: [...state.notifications, ...fullNotifications],
        isLoading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  addNotification: (notification) => {
    const state = get();
    set({
      notifications: [...state.notifications, {
        ...notification,
        id: generateId(),
        sentAt: new Date().toISOString()
      }]
    });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  resetAll: () => {
    set({
      volunteers: [],
      positions: [],
      trainingRecords: [],
      assignments: [],
      checkResults: [],
      snapshots: [],
      notifications: [],
      currentPhase: 'idle',
      selectedSnapshotIds: [null, null],
      comparisonResult: null,
      isLoading: false,
      error: null
    });
  }
}));
