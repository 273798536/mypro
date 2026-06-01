import { create } from 'zustand';
import type {
  Conflict,
  ConflictType,
} from '../types';
import {
  saveToStore,
  getAllFromStore,
  clearStore,
} from '../utils/storage';
import {
  detectConflictsForAllBookings,
  type ConflictDetectionContext,
} from '../engine/conflictDetector';

interface ConflictState {
  conflicts: Conflict[];
  isLoading: boolean;
  error: string | null;

  loadFromStorage: () => Promise<void>;
  detectConflicts: () => void;
  resolveConflict: (conflictId: string) => void;
  markResolved: (conflictId: string) => void;
  getConflictsByBooking: (bookingId: string) => Conflict[];
  getAffectedBookings: (conflictId: string) => string[];
  getConflictCountByType: (type: ConflictType) => number;
  getUnresolvedCount: () => number;
  clearConflicts: () => Promise<void>;
}

function getDataStore() {
  return require('./useDataStore').useDataStore;
}

function getBookingStore() {
  return require('./useBookingStore').useBookingStore;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  conflicts: [],
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const conflicts = await getAllFromStore<Conflict>('conflicts');
      set({ conflicts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载冲突数据失败',
        isLoading: false,
      });
    }
  },

  detectConflicts: () => {
    const useDataStore = getDataStore();
    const useBookingStore = getBookingStore();
    
    const { rooms, bands, courses, teacherLeaves } = useDataStore.getState();
    const { bookings } = useBookingStore.getState();

    if (bookings.length === 0) return;

    const context: ConflictDetectionContext = {
      rooms,
      bands,
      courses,
      bookings,
      teacherLeaves,
    };

    const conflicts = detectConflictsForAllBookings(context);
    
    const updatedBookings = bookings.map(b => {
      const bookingConflicts = conflicts.filter(c => c.bookingId === b.id);
      if (bookingConflicts.length > 0 && b.status !== 'resolved') {
        return { ...b, status: 'conflict' as const };
      }
      return b;
    });

    useBookingStore.setState({ bookings: updatedBookings });
    
    bookings.forEach(booking => {
      const bookingConflicts = conflicts.filter(c => c.bookingId === booking.id);
      if (bookingConflicts.length > 0) {
        useBookingStore.getState().addConflictDetectNode(booking.id, bookingConflicts.length);
      }
    });

    saveToStore('conflicts', conflicts);
    set({ conflicts });
  },

  resolveConflict: (conflictId) => {
    const { conflicts } = get();
    const useBookingStore = getBookingStore();
    
    const updatedConflicts = conflicts.map(c =>
      c.id === conflictId ? { ...c, resolved: true } : c,
    );
    
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      const booking = useBookingStore.getState().getBookingById(conflict.bookingId);
      if (booking) {
        useBookingStore.getState().resolveConflict(
          conflict.bookingId,
          `手动解决冲突: ${conflict.description}`,
        );
      }
    }

    saveToStore('conflicts', updatedConflicts);
    set({ conflicts: updatedConflicts });
  },

  markResolved: (conflictId) => {
    get().resolveConflict(conflictId);
  },

  getConflictsByBooking: (bookingId) => {
    return get().conflicts.filter(c => c.bookingId === bookingId);
  },

  getAffectedBookings: (conflictId) => {
    const conflict = get().conflicts.find(c => c.id === conflictId);
    return conflict?.affectedBookings || [];
  },

  getConflictCountByType: (type) => {
    return get().conflicts.filter(c => c.type === type && !c.resolved).length;
  },

  getUnresolvedCount: () => {
    return get().conflicts.filter(c => !c.resolved).length;
  },

  clearConflicts: async () => {
    await clearStore('conflicts');
    set({ conflicts: [] });
  },
}));
