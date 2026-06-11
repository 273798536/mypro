import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Volunteer,
  Stage,
  TimeSlot,
  Position,
  ScheduleEntry,
  DataSource,
  ScheduleVersion,
  ScheduleStats,
  ConflictType,
  VersionChange,
  Conflict
} from '../types';
import {
  mockVolunteers,
  mockStages,
  mockTimeSlots,
  mockPositions,
  mockScheduleEntries,
  mockDataSources,
  mockVersions,
  generateId
} from '../utils/mockData';
import { createScheduleEntry, autoAssign as autoAssignUtil } from '../utils/scheduler';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

interface ScheduleState {
  volunteers: Volunteer[];
  stages: Stage[];
  timeSlots: TimeSlot[];
  positions: Position[];
  scheduleEntries: ScheduleEntry[];
  dataSources: DataSource[];
  versions: ScheduleVersion[];
  activeDate: string;
  selectedVolunteer: Volunteer | null;
  selectedPosition: Position | null;
  notifications: Notification[];

  setActiveDate: (date: string) => void;
  setSelectedVolunteer: (volunteer: Volunteer | null) => void;
  setSelectedPosition: (position: Position | null) => void;

  addNotification: (type: Notification['type'], message: string) => void;
  clearNotification: (id: string) => void;

  addVolunteer: (volunteer: Volunteer) => { success: boolean; message?: string };
  updateVolunteer: (id: string, updates: Partial<Volunteer>) => { success: boolean; message?: string };
  removeVolunteer: (id: string) => { success: boolean; message?: string };

  addScheduleEntry: (
    volunteerId: string,
    positionId: string,
    timeSlotId: string,
    stageId: string
  ) => { success: boolean; message?: string; entry?: ScheduleEntry };
  removeScheduleEntry: (entryId: string) => { success: boolean; message?: string };
  updateScheduleEntry: (
    entryId: string,
    updates: Partial<ScheduleEntry>
  ) => { success: boolean; message?: string };

  addStage: (stage: Stage) => { success: boolean; message?: string };
  updateStage: (id: string, updates: Partial<Stage>) => { success: boolean; message?: string };
  removeStage: (id: string) => { success: boolean; message?: string };

  addPosition: (position: Position) => { success: boolean; message?: string };
  updatePosition: (id: string, updates: Partial<Position>) => { success: boolean; message?: string };
  removePosition: (id: string) => { success: boolean; message?: string };

  addTimeSlot: (timeSlot: TimeSlot) => { success: boolean; message?: string };
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => { success: boolean; message?: string };
  removeTimeSlot: (id: string) => { success: boolean; message?: string };

  autoAssign: () => { success: boolean; assignedCount: number; message?: string };

  createVersion: (name: string, createdBy: string) => { success: boolean; message?: string };

  detectHeadcountConflicts: () => void;

  getStats: () => ScheduleStats;
  getAllConflicts: () => ScheduleEntry[];
  getScheduledVolunteers: () => Volunteer[];
  getUnscheduledVolunteers: () => Volunteer[];
}

const appendChangeToWorkingVersion = (
  versions: ScheduleVersion[],
  change: VersionChange
): ScheduleVersion[] => {
  if (versions.length === 0) {
    return [
      {
        id: `ver-working-${Date.now()}`,
        name: '工作区当前状态',
        timestamp: new Date().toISOString(),
        snapshot: { volunteers: [], entries: [] },
        changes: [change],
        createdBy: '系统'
      },
      ...versions
    ];
  }
  const workingVersion = versions[0];
  const updatedWorking: ScheduleVersion = {
    ...workingVersion,
    timestamp: new Date().toISOString(),
    changes: [change, ...workingVersion.changes].slice(0, 200)
  };
  return [updatedWorking, ...versions.slice(1)];
};

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      volunteers: mockVolunteers,
      stages: mockStages,
      timeSlots: mockTimeSlots,
      positions: mockPositions,
      scheduleEntries: mockScheduleEntries,
      dataSources: mockDataSources,
      versions: (() => {
        const existing = [...mockVersions];
        if (existing.length === 0 || !existing[0].id.startsWith('ver-working')) {
          existing.unshift({
            id: `ver-working-${Date.now()}`,
            name: '工作区当前状态',
            timestamp: new Date().toISOString(),
            snapshot: { volunteers: [], entries: [] },
            changes: [],
            createdBy: '系统'
          });
        }
        return existing;
      })(),
      activeDate: '2026-06-10',
      selectedVolunteer: null,
      selectedPosition: null,
      notifications: [],

      setActiveDate: (date) => set({ activeDate: date }),
      setSelectedVolunteer: (volunteer) => set({ selectedVolunteer: volunteer }),
      setSelectedPosition: (position) => set({ selectedPosition: position }),

      addNotification: (type, message) => {
        const notification: Notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type,
          message,
          timestamp: new Date().toISOString()
        };
        set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 10) }));
        setTimeout(() => {
          set((state) => ({ notifications: state.notifications.filter((n) => n.id !== notification.id) }));
        }, 4000);
      },

      clearNotification: (id) =>
        set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

      addVolunteer: (volunteer) => {
        set((state) => ({ volunteers: [...state.volunteers, volunteer] }));
        get().addNotification('success', `志愿者「${volunteer.name}」添加成功`);
        return { success: true };
      },

      updateVolunteer: (id, updates) => {
        const state = get();
        const volunteer = state.volunteers.find((v) => v.id === id);
        if (!volunteer) {
          get().addNotification('error', `志愿者不存在，更新失败`);
          return { success: false, message: '志愿者不存在' };
        }
        set((state) => ({
          volunteers: state.volunteers.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
          )
        }));
        const oldVal: Record<string, unknown> = {};
        const newVal: Record<string, unknown> = {};
        (Object.keys(updates) as (keyof typeof updates)[]).forEach((k) => {
          oldVal[k] = volunteer[k];
          newVal[k] = updates[k];
        });
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'update',
            entityType: 'volunteer',
            entityId: id,
            oldValue: oldVal,
            newValue: newVal,
            timestamp: new Date().toISOString()
          })
        }));
        get().addNotification('success', `志愿者「${volunteer.name}」信息已更新`);
        return { success: true };
      },

      removeVolunteer: (id) => {
        const state = get();
        const volunteer = state.volunteers.find((v) => v.id === id);
        const removedEntries = state.scheduleEntries.filter((e) => e.volunteerId === id);
        set((state) => ({
          volunteers: state.volunteers.filter((v) => v.id !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.volunteerId !== id)
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'remove',
            entityType: 'volunteer',
            entityId: id,
            oldValue: volunteer,
            timestamp: new Date().toISOString()
          })
        }));
        removedEntries.forEach((entry) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'entry',
              entityId: entry.id,
              oldValue: entry,
              timestamp: new Date().toISOString()
            })
          }));
        });
        get().detectHeadcountConflicts();
        if (volunteer) {
          get().addNotification(
            'warning',
            `志愿者「${volunteer.name}」已移除，同步取消了 ${removedEntries.length} 条排班`
          );
        }
        return { success: true };
      },

      addScheduleEntry: (volunteerId, positionId, timeSlotId, stageId) => {
        const state = get();
        const volunteer = state.volunteers.find((v) => v.id === volunteerId);
        const position = state.positions.find((p) => p.id === positionId);

        const existingForPosition = state.scheduleEntries.filter((e) => e.positionId === positionId);
        if (position && existingForPosition.length >= position.headcount) {
          get().addNotification('error', `岗位「${position.name}」已招满，无法继续分配`);
          return { success: false, message: '岗位已满' };
        }
        const overlapping = state.scheduleEntries.find(
          (e) => e.volunteerId === volunteerId && e.timeSlotId === timeSlotId
        );
        if (overlapping) {
          const vs = state.volunteers.find((v) => v.id === volunteerId);
          get().addNotification(
            'error',
            `志愿者「${vs?.name || volunteerId}」该时段已有排班`
          );
          return { success: false, message: '时段重叠' };
        }

        const entry = createScheduleEntry(
          volunteerId,
          positionId,
          timeSlotId,
          stageId,
          state.volunteers,
          state.positions,
          state.timeSlots,
          state.scheduleEntries
        );
        if (!entry) {
          get().addNotification('error', '排班创建失败，数据异常');
          return { success: false, message: '创建失败' };
        }

        set((state) => ({ scheduleEntries: [...state.scheduleEntries, entry] }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'add',
            entityType: 'entry',
            entityId: entry.id,
            newValue: entry,
            timestamp: new Date().toISOString()
          })
        }));
        get().detectHeadcountConflicts();
        const vName = volunteer?.name || volunteerId;
        const pName = position?.name || positionId;
        get().addNotification('success', `「${vName}」已分配到岗位「${pName}」`);
        return { success: true, entry };
      },

      removeScheduleEntry: (entryId) => {
        const state = get();
        const entry = state.scheduleEntries.find((e) => e.id === entryId);
        if (!entry) {
          get().addNotification('error', '排班记录不存在，删除失败');
          return { success: false, message: '记录不存在' };
        }
        const volunteer = state.volunteers.find((v) => v.id === entry.volunteerId);
        const position = state.positions.find((p) => p.id === entry.positionId);

        set((state) => ({
          scheduleEntries: state.scheduleEntries.filter((e) => e.id !== entryId)
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'remove',
            entityType: 'entry',
            entityId: entryId,
            oldValue: entry,
            timestamp: new Date().toISOString()
          })
        }));
        get().detectHeadcountConflicts();
        const vName = volunteer?.name || entry.volunteerId;
        const pName = position?.name || entry.positionId;
        get().addNotification('warning', `取消「${vName}」在岗位「${pName}」的排班`);
        return { success: true };
      },

      updateScheduleEntry: (entryId, updates) => {
        const state = get();
        const entry = state.scheduleEntries.find((e) => e.id === entryId);
        if (!entry) {
          get().addNotification('error', '排班记录不存在，更新失败');
          return { success: false, message: '记录不存在' };
        }
        const oldVal: Record<string, unknown> = {};
        const newVal: Record<string, unknown> = {};
        (Object.keys(updates) as (keyof typeof updates)[]).forEach((k) => {
          oldVal[k] = entry[k];
          newVal[k] = updates[k];
        });
        set((state) => ({
          scheduleEntries: state.scheduleEntries.map((e) =>
            e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'update',
            entityType: 'entry',
            entityId: entryId,
            oldValue: oldVal,
            newValue: newVal,
            timestamp: new Date().toISOString()
          })
        }));
        get().addNotification('info', '排班记录已更新');
        return { success: true };
      },

      addStage: (stage) => {
        set((state) => ({ stages: [...state.stages, stage] }));
        get().addNotification('success', `舞台「${stage.name}」已添加`);
        return { success: true };
      },

      updateStage: (id, updates) => {
        const state = get();
        const stage = state.stages.find((s) => s.id === id);
        set((state) => ({
          stages: state.stages.map((s) => (s.id === id ? { ...s, ...updates } : s))
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'update',
            entityType: 'stage',
            entityId: id,
            timestamp: new Date().toISOString()
          })
        }));
        if (updates.name && stage) {
          get().addNotification('success', `舞台「${stage.name}」重命名为「${updates.name}」`);
        }
        return { success: true };
      },

      removeStage: (id) => {
        const state = get();
        const stage = state.stages.find((s) => s.id === id);
        const removedPositions = state.positions.filter((p) => p.stageId === id);
        const removedTimeSlots = state.timeSlots.filter((t) => t.stageId === id);
        const removedEntries = state.scheduleEntries.filter((e) => e.stageId === id);
        set((state) => ({
          stages: state.stages.filter((s) => s.id !== id),
          positions: state.positions.filter((p) => p.stageId !== id),
          timeSlots: state.timeSlots.filter((t) => t.stageId !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.stageId !== id)
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'remove',
            entityType: 'stage',
            entityId: id,
            oldValue: stage,
            timestamp: new Date().toISOString()
          })
        }));
        removedPositions.forEach((p) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'position',
              entityId: p.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        removedTimeSlots.forEach((t) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'timeSlot',
              entityId: t.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        removedEntries.forEach((e) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'entry',
              entityId: e.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        get().detectHeadcountConflicts();
        if (stage) {
          get().addNotification(
            'warning',
            `舞台「${stage.name}」已删除，同步移除 ${removedPositions.length} 个岗位、${removedTimeSlots.length} 个时段、${removedEntries.length} 条排班`
          );
        }
        return { success: true };
      },

      addPosition: (position) => {
        set((state) => ({ positions: [...state.positions, position] }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'add',
            entityType: 'position',
            entityId: position.id,
            newValue: position,
            timestamp: new Date().toISOString()
          })
        }));
        get().detectHeadcountConflicts();
        get().addNotification('success', `岗位「${position.name}」已添加`);
        return { success: true };
      },

      updatePosition: (id, updates) => {
        const state = get();
        const position = state.positions.find((p) => p.id === id);
        set((state) => ({
          positions: state.positions.map((p) => (p.id === id ? { ...p, ...updates } : p))
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'update',
            entityType: 'position',
            entityId: id,
            timestamp: new Date().toISOString()
          })
        }));
        get().detectHeadcountConflicts();
        if (updates.name && position) {
          get().addNotification('success', `岗位「${position.name}」重命名为「${updates.name}」`);
        }
        return { success: true };
      },

      removePosition: (id) => {
        const state = get();
        const position = state.positions.find((p) => p.id === id);
        const removedEntries = state.scheduleEntries.filter((e) => e.positionId === id);
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.positionId !== id)
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'remove',
            entityType: 'position',
            entityId: id,
            oldValue: position,
            timestamp: new Date().toISOString()
          })
        }));
        removedEntries.forEach((e) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'entry',
              entityId: e.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        get().detectHeadcountConflicts();
        if (position) {
          get().addNotification(
            'warning',
            `岗位「${position.name}」已删除，同步取消 ${removedEntries.length} 条排班`
          );
        }
        return { success: true };
      },

      addTimeSlot: (timeSlot) => {
        set((state) => ({ timeSlots: [...state.timeSlots, timeSlot] }));
        get().addNotification('success', `时段「${timeSlot.label}」已添加`);
        return { success: true };
      },

      updateTimeSlot: (id, updates) => {
        set((state) => ({
          timeSlots: state.timeSlots.map((t) => (t.id === id ? { ...t, ...updates } : t))
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'update',
            entityType: 'timeSlot',
            entityId: id,
            timestamp: new Date().toISOString()
          })
        }));
        return { success: true };
      },

      removeTimeSlot: (id) => {
        const state = get();
        const timeSlot = state.timeSlots.find((t) => t.id === id);
        const removedPositions = state.positions.filter((p) => p.timeSlotId === id);
        const removedEntries = state.scheduleEntries.filter((e) => e.timeSlotId === id);
        set((state) => ({
          timeSlots: state.timeSlots.filter((t) => t.id !== id),
          positions: state.positions.filter((p) => p.timeSlotId !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.timeSlotId !== id)
        }));
        set((state) => ({
          versions: appendChangeToWorkingVersion(state.versions, {
            type: 'remove',
            entityType: 'timeSlot',
            entityId: id,
            oldValue: timeSlot,
            timestamp: new Date().toISOString()
          })
        }));
        removedPositions.forEach((p) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'position',
              entityId: p.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        removedEntries.forEach((e) => {
          set((state) => ({
            versions: appendChangeToWorkingVersion(state.versions, {
              type: 'remove',
              entityType: 'entry',
              entityId: e.id,
              timestamp: new Date().toISOString()
            })
          }));
        });
        get().detectHeadcountConflicts();
        if (timeSlot) {
          get().addNotification(
            'warning',
            `时段「${timeSlot.label}」已删除，同步移除 ${removedPositions.length} 个岗位、${removedEntries.length} 条排班`
          );
        }
        return { success: true };
      },

      autoAssign: () => {
        const state = get();
        const previousEntries = [...state.scheduleEntries];
        const previousIds = new Set(previousEntries.map((e) => e.id));
        const newEntries = autoAssignUtil(state.volunteers, state.positions, state.timeSlots);

        previousEntries.forEach((e) => {
          if (!newEntries.find((ne) => ne.id === e.id)) {
            set((s) => ({
              versions: appendChangeToWorkingVersion(s.versions, {
                type: 'remove',
                entityType: 'entry',
                entityId: e.id,
                oldValue: e,
                timestamp: new Date().toISOString()
              })
            }));
          }
        });
        newEntries.forEach((e) => {
          if (!previousIds.has(e.id)) {
            set((s) => ({
              versions: appendChangeToWorkingVersion(s.versions, {
                type: 'add',
                entityType: 'entry',
                entityId: e.id,
                newValue: e,
                timestamp: new Date().toISOString()
              })
            }));
          }
        });

        const addedCount = newEntries.filter((e) => !previousIds.has(e.id)).length;
        const removedCount = previousEntries.filter(
          (e) => !newEntries.find((ne) => ne.id === e.id)
        ).length;

        set({ scheduleEntries: newEntries });
        get().detectHeadcountConflicts();
        get().addNotification(
          'success',
          `智能排班完成：新增 ${addedCount} 条、取消 ${removedCount} 条，共 ${newEntries.length} 条有效排班`
        );
        return { success: true, assignedCount: newEntries.length };
      },

      createVersion: (name, createdBy) => {
        const state = get();
        const newVersion: ScheduleVersion = {
          id: `ver-${Date.now()}`,
          name,
          timestamp: new Date().toISOString(),
          snapshot: {
            volunteers: JSON.parse(JSON.stringify(state.volunteers)),
            entries: JSON.parse(JSON.stringify(state.scheduleEntries))
          },
          changes: state.versions[0]?.changes?.slice(0, 50) || [],
          createdBy
        };
        set((state) => ({ versions: [newVersion, ...state.versions] }));
        get().addNotification('success', `已保存版本「${name}」，包含 ${newVersion.snapshot.entries.length} 条排班快照`);
        return { success: true };
      },

      detectHeadcountConflicts: () => {
        const state = get();
        const { positions, scheduleEntries, volunteers, stages, timeSlots } = state;

        const updatedEntries = scheduleEntries.map((e) => ({
          ...e,
          conflicts: e.conflicts.filter((c) => c.type !== 'headcount')
        }));

        const headcountIssues: {
          positionId: string;
          needed: number;
          assigned: number;
          entryIds: string[];
        }[] = [];

        positions.forEach((position) => {
          const entriesForPos = updatedEntries.filter((e) => e.positionId === position.id);
          if (entriesForPos.length < position.headcount) {
            headcountIssues.push({
              positionId: position.id,
              needed: position.headcount,
              assigned: entriesForPos.length,
              entryIds: entriesForPos.map((e) => e.id)
            });
          }
        });

        const newHeadcountConflicts: Map<string, Conflict> = new Map();
        headcountIssues.forEach((issue) => {
          const position = positions.find((p) => p.id === issue.positionId);
          const timeSlot = timeSlots.find((t) => t.id === position?.timeSlotId);
          const stage = stages.find((s) => s.id === position?.stageId);
          const shortage = issue.needed - issue.assigned;

          const conflict: Conflict = {
            id: `hc-${issue.positionId}-${generateId()}`,
            type: 'headcount' as ConflictType,
            severity: 'warning',
            message: `${stage?.name || ''}${timeSlot ? `·${timeSlot.label}` : ''} · 岗位「${
              position?.name
            }」缺 ${shortage} 人（已到 ${issue.assigned}/${issue.needed}）`,
            affectedEntries: issue.entryIds,
            details: {
              positionId: issue.positionId,
              positionName: position?.name,
              needed: issue.needed,
              assigned: issue.assigned,
              shortage
            }
          };

          if (issue.entryIds.length > 0) {
            issue.entryIds.forEach((eid) => newHeadcountConflicts.set(eid, conflict));
          } else {
            const entry = updatedEntries.find((e) => e.positionId === issue.positionId);
            if (entry) {
              newHeadcountConflicts.set(entry.id, conflict);
            }
          }
        });

        newHeadcountConflicts.forEach((conflict, entryId) => {
          const idx = updatedEntries.findIndex((e) => e.id === entryId);
          if (idx >= 0) {
            updatedEntries[idx] = {
              ...updatedEntries[idx],
              conflicts: [...updatedEntries[idx].conflicts, conflict]
            };
          } else {
            const volunteerId = volunteers.find((v) => v.status === 'active')?.id || '';
            const positionId = (conflict.details as Record<string, unknown>).positionId as string;
            const position = positions.find((p) => p.id === positionId);
            if (position && volunteerId) {
              const placeholderEntry: ScheduleEntry = {
                id: `placeholder-${positionId}`,
                volunteerId,
                positionId,
                timeSlotId: position.timeSlotId,
                stageId: position.stageId,
                status: 'scheduled',
                conflicts: [conflict],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              updatedEntries.push(placeholderEntry);
            }
          }
        });

        set({ scheduleEntries: updatedEntries });
      },

      getStats: () => {
        const state = get();
        const scheduledIds = new Set(state.scheduleEntries.map((e) => e.volunteerId));
        const scheduledVolunteers = state.volunteers.filter((v) => scheduledIds.has(v.id));
        const pendingVolunteers = state.volunteers.filter((v) => !scheduledIds.has(v.id));

        const conflictByType: Record<ConflictType, number> = {
          mealBreak: 0,
          credential: 0,
          headcount: 0,
          skill: 0,
          overlap: 0
        };

        let totalConflicts = 0;
        state.scheduleEntries.forEach((entry) => {
          entry.conflicts.forEach((c) => {
            conflictByType[c.type]++;
            totalConflicts++;
          });
        });

        const positionsFilled = state.positions.filter((p) => {
          const count = state.scheduleEntries.filter((e) => e.positionId === p.id).length;
          return count >= p.headcount;
        }).length;

        return {
          totalVolunteers: state.volunteers.length,
          scheduledVolunteers: scheduledVolunteers.length,
          pendingVolunteers: pendingVolunteers.length,
          totalConflicts,
          conflictByType,
          positionsFilled,
          totalPositions: state.positions.length
        };
      },

      getAllConflicts: () => {
        const state = get();
        return state.scheduleEntries.filter((e) => e.conflicts.length > 0);
      },

      getScheduledVolunteers: () => {
        const state = get();
        const scheduledIds = new Set(state.scheduleEntries.map((e) => e.volunteerId));
        return state.volunteers.filter((v) => scheduledIds.has(v.id));
      },

      getUnscheduledVolunteers: () => {
        const state = get();
        const scheduledIds = new Set(state.scheduleEntries.map((e) => e.volunteerId));
        return state.volunteers.filter((v) => !scheduledIds.has(v.id) && v.status === 'active');
      }
    }),
    {
      name: 'festival-schedule-storage',
      partialize: (state) => ({
        volunteers: state.volunteers,
        stages: state.stages,
        timeSlots: state.timeSlots,
        positions: state.positions,
        scheduleEntries: state.scheduleEntries,
        dataSources: state.dataSources,
        versions: state.versions
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.versions[0] || !state.versions[0].id.startsWith('ver-working')) {
            state.versions.unshift({
              id: `ver-working-${Date.now()}`,
              name: '工作区当前状态',
              timestamp: new Date().toISOString(),
              snapshot: { volunteers: [], entries: [] },
              changes: [],
              createdBy: '系统'
            });
          }
          setTimeout(() => state.detectHeadcountConflicts(), 0);
        }
      }
    }
  )
);
