import { create } from 'zustand';
import type { YardState, Slot, Container, ViewConfig, ImpactAnalysis } from '@/@types';
import { initialState } from '@/data/mockData';

interface YardActions {
  selectSlot: (slotId: string | null) => void;
  selectContainer: (containerId: string | null) => void;
  selectConflict: (conflictId: string | null) => void;
  setCurrentVoyage: (voyageId: string | null) => void;
  lockSlot: (slotId: string, reason: string, lockedBy: string) => void;
  unlockSlot: (slotId: string) => void;
  moveContainer: (containerId: string, newSlotId: string) => void;
  saveView: (name: string, cameraPosition: [number, number, number], cameraTarget: [number, number, number]) => void;
  deleteView: (viewId: string) => void;
  setPlaybackTime: (time: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  recalculateConflicts: () => void;
  toggleImpactMode: () => void;
  setModifiedSlot: (slotId: string | null) => void;
  calculateImpact: (modifiedSlotId: string) => void;
  clearImpact: () => void;
  resolveConflict: (conflictId: string) => void;
  ignoreConflict: (conflictId: string) => void;
  getSlotById: (slotId: string) => Slot | undefined;
  getContainerById: (containerId: string) => Container | undefined;
  getContainersBySlot: (slotId: string) => Container[];
  getConflictsBySlot: (slotId: string) => typeof initialState.conflicts;
  getConflictsByContainer: (containerId: string) => typeof initialState.conflicts;
}

export const useYardStore = create<YardState & YardActions>((set, get) => ({
  ...initialState,

  selectSlot: (slotId) => set({ selectedSlotId: slotId, selectedContainerId: null }),
  
  selectContainer: (containerId) => set({ selectedContainerId: containerId }),
  
  selectConflict: (conflictId) => set({ selectedConflictId: conflictId }),
  
  setCurrentVoyage: (voyageId) => set({ currentVoyageId: voyageId }),
  
  lockSlot: (slotId, reason, lockedBy) => set((state) => ({
    slots: state.slots.map((slot) =>
      slot.id === slotId
        ? {
            ...slot,
            isLocked: true,
            lockRecord: {
              id: `lock-${slotId}-${Date.now()}`,
              slotId,
              reason,
              lockedBy,
              lockedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
          }
        : slot
    ),
  })),
  
  unlockSlot: (slotId) => set((state) => ({
    slots: state.slots.map((slot) =>
      slot.id === slotId ? { ...slot, isLocked: false, lockRecord: undefined } : slot
    ),
  })),
  
  moveContainer: (containerId, newSlotId) => set((state) => {
    const container = state.containers.find((c) => c.id === containerId);
    if (!container) return state;
    
    const oldSlotId = container.slotId;
    
    return {
      containers: state.containers.map((c) =>
        c.id === containerId ? { ...c, slotId: newSlotId } : c
      ),
      slots: state.slots.map((slot) => {
        if (slot.id === oldSlotId) {
          const hasOtherContainers = state.containers.some(
            (c) => c.slotId === oldSlotId && c.id !== containerId
          );
          return { ...slot, status: hasOtherContainers ? 'occupied' : 'empty' };
        }
        if (slot.id === newSlotId) {
          return { ...slot, status: 'occupied' };
        }
        return slot;
      }),
      modifiedSlotId: newSlotId,
    };
  }),
  
  saveView: (name, cameraPosition, cameraTarget) => set((state) => ({
    viewConfigs: [
      ...state.viewConfigs,
      {
        id: `view-${Date.now()}`,
        name,
        cameraPosition,
        cameraTarget,
        createdAt: new Date().toISOString(),
        userId: 'current-user',
      },
    ],
  })),
  
  deleteView: (viewId) => set((state) => ({
    viewConfigs: state.viewConfigs.filter((v) => v.id !== viewId),
  })),
  
  setPlaybackTime: (time) => set({ playbackTime: time }),
  
  setPlaying: (isPlaying) => set({ isPlaying }),
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  recalculateConflicts: () => {
    console.log('Recalculating conflicts...');
  },
  
  toggleImpactMode: () => set((state) => ({ isImpactMode: !state.isImpactMode })),
  
  setModifiedSlot: (slotId) => set({ modifiedSlotId: slotId }),
  
  calculateImpact: (modifiedSlotId) => set((state) => {
    const modifiedContainer = state.containers.find((c) => c.slotId === modifiedSlotId);
    const affectedContainers: string[] = [];
    const affectedJobs: string[] = [];
    const affectedCranes: string[] = [];
    const affectedVoyages: string[] = [];
    
    if (modifiedContainer) {
      state.containers.forEach((c) => {
        const slot = state.slots.find((s) => s.id === c.slotId);
        const modifiedSlot = state.slots.find((s) => s.id === modifiedSlotId);
        if (slot && modifiedSlot && Math.abs(slot.bay - modifiedSlot.bay) <= 2) {
          if (!affectedContainers.includes(c.id)) {
            affectedContainers.push(c.id);
          }
        }
      });
      
      state.jobs.forEach((job) => {
        if (job.containerId === modifiedContainer.id) {
          affectedJobs.push(job.id);
          if (!affectedCranes.includes(job.craneId)) {
            affectedCranes.push(job.craneId);
          }
        }
      });
      
      if (!affectedVoyages.includes(modifiedContainer.voyageId)) {
        affectedVoyages.push(modifiedContainer.voyageId);
      }
    }
    
    const impactAnalysis: ImpactAnalysis = {
      modifiedSlotId,
      affectedContainers,
      affectedJobs,
      affectedCranes,
      affectedVoyages,
      newConflicts: [],
      resolvedConflicts: [],
      rehandleCountChange: affectedContainers.length > 0 ? 2 : 0,
    };
    
    return { impactAnalysis, isImpactMode: true };
  }),
  
  clearImpact: () => set({ impactAnalysis: null, isImpactMode: false, modifiedSlotId: null }),
  
  resolveConflict: (conflictId) => set((state) => ({
    conflicts: state.conflicts.map((c) =>
      c.id === conflictId ? { ...c, status: 'resolved' } : c
    ),
  })),
  
  ignoreConflict: (conflictId) => set((state) => ({
    conflicts: state.conflicts.map((c) =>
      c.id === conflictId ? { ...c, status: 'ignored' } : c
    ),
  })),
  
  getSlotById: (slotId) => get().slots.find((s) => s.id === slotId),
  
  getContainerById: (containerId) => get().containers.find((c) => c.id === containerId),
  
  getContainersBySlot: (slotId) => get().containers.filter((c) => c.slotId === slotId),
  
  getConflictsBySlot: (slotId) =>
    get().conflicts.filter((c) => c.involvedSlotIds.includes(slotId)),
  
  getConflictsByContainer: (containerId) =>
    get().conflicts.filter((c) => c.involvedContainerIds.includes(containerId)),
}));
