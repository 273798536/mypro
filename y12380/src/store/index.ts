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
  ConflictType
} from '../types';
import {
  mockVolunteers,
  mockStages,
  mockTimeSlots,
  mockPositions,
  mockScheduleEntries,
  mockDataSources,
  mockVersions
} from '../utils/mockData';
import { createScheduleEntry } from '../utils/scheduler';

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

  setActiveDate: (date: string) => void;
  setSelectedVolunteer: (volunteer: Volunteer | null) => void;
  setSelectedPosition: (position: Position | null) => void;

  addVolunteer: (volunteer: Volunteer) => void;
  updateVolunteer: (id: string, updates: Partial<Volunteer>) => void;
  removeVolunteer: (id: string) => void;

  addScheduleEntry: (
    volunteerId: string,
    positionId: string,
    timeSlotId: string,
    stageId: string
  ) => void;
  removeScheduleEntry: (entryId: string) => void;
  updateScheduleEntry: (entryId: string, updates: Partial<ScheduleEntry>) => void;

  addStage: (stage: Stage) => void;
  updateStage: (id: string, updates: Partial<Stage>) => void;
  removeStage: (id: string) => void;

  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;

  createVersion: (name: string, createdBy: string) => void;

  getStats: () => ScheduleStats;
  getAllConflicts: () => ScheduleEntry[];
  getScheduledVolunteers: () => Volunteer[];
  getUnscheduledVolunteers: () => Volunteer[];
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      volunteers: mockVolunteers,
      stages: mockStages,
      timeSlots: mockTimeSlots,
      positions: mockPositions,
      scheduleEntries: mockScheduleEntries,
      dataSources: mockDataSources,
      versions: mockVersions,
      activeDate: '2026-06-10',
      selectedVolunteer: null,
      selectedPosition: null,

      setActiveDate: (date) => set({ activeDate: date }),
      setSelectedVolunteer: (volunteer) => set({ selectedVolunteer: volunteer }),
      setSelectedPosition: (position) => set({ selectedPosition: position }),

      addVolunteer: (volunteer) =>
        set((state) => ({
          volunteers: [...state.volunteers, volunteer]
        })),

      updateVolunteer: (id, updates) =>
        set((state) => ({
          volunteers: state.volunteers.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
          )
        })),

      removeVolunteer: (id) =>
        set((state) => ({
          volunteers: state.volunteers.filter((v) => v.id !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.volunteerId !== id)
        })),

      addScheduleEntry: (volunteerId, positionId, timeSlotId, stageId) => {
        const state = get();
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
        if (entry) {
          set((state) => ({
            scheduleEntries: [...state.scheduleEntries, entry]
          }));
        }
      },

      removeScheduleEntry: (entryId) =>
        set((state) => ({
          scheduleEntries: state.scheduleEntries.filter((e) => e.id !== entryId)
        })),

      updateScheduleEntry: (entryId, updates) =>
        set((state) => ({
          scheduleEntries: state.scheduleEntries.map((e) =>
            e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
        })),

      addStage: (stage) =>
        set((state) => ({
          stages: [...state.stages, stage]
        })),

      updateStage: (id, updates) =>
        set((state) => ({
          stages: state.stages.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          )
        })),

      removeStage: (id) =>
        set((state) => ({
          stages: state.stages.filter((s) => s.id !== id),
          positions: state.positions.filter((p) => p.stageId !== id),
          timeSlots: state.timeSlots.filter((t) => t.stageId !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.stageId !== id)
        })),

      addPosition: (position) =>
        set((state) => ({
          positions: [...state.positions, position]
        })),

      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      removePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
          scheduleEntries: state.scheduleEntries.filter((e) => e.positionId !== id)
        })),

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
          changes: [],
          createdBy
        };
        set((state) => ({
          versions: [newVersion, ...state.versions]
        }));
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
      })
    }
  )
);
