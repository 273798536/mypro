import { create } from 'zustand';
import type {
  Booking,
  DataChainNode,
  Room,
  Band,
  Course,
  DataSource,
  TeacherLeave,
  ChangeHistory,
} from '../types';
import {
  saveToStore,
  getAllFromStore,
  saveSingleToStore,
} from '../utils/storage';
import {
  generateBookings,
  changeBookingRoom,
  adjustBookingTime,
  resolveConflict as resolveBookingConflict,
} from '../engine/bookingScheduler';
import {
  createConflictDetectChainNode,
  addChainNode,
} from '../engine/chainTracker';
import { getStore, registerStore } from './registry';

interface BookingState {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;

  loadFromStorage: () => Promise<void>;
  generateBookings: () => void;
  changeRoom: (bookingId: string, newRoomId: string, remark?: string) => void;
  adjustTime: (bookingId: string, newStart: string, newEnd: string, remark?: string) => void;
  resolveConflict: (bookingId: string, solution: string) => void;
  getBookingById: (id: string) => Booking | undefined;
  getBookingChain: (id: string) => DataChainNode[];
  updateBookings: (bookings: Booking[]) => void;
  addConflictDetectNode: (bookingId: string, conflictCount: number) => void;
}

type DataStoreApi = { getState: () => { rooms: Room[]; bands: Band[]; courses: Course[]; sources: DataSource[]; teacherLeaves: TeacherLeave[] } };
type ConflictStoreApi = { getState: () => { detectConflicts: () => void } };
type HistoryStoreApi = { getState: () => { addHistory: (h: ChangeHistory) => void } };

function getDataStore() {
  return getStore<DataStoreApi>('data');
}

function getConflictStore() {
  return getStore<ConflictStoreApi>('conflict');
}

function getHistoryStore() {
  return getStore<HistoryStoreApi>('history');
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const bookings = await getAllFromStore<Booking>('bookings');
      set({ bookings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载预约数据失败',
        isLoading: false,
      });
    }
  },

  generateBookings: () => {
    const useDataStore = getDataStore();
    const { rooms, bands, courses, sources } = useDataStore.getState();
    if (rooms.length === 0 || bands.length === 0 || courses.length === 0) {
      set({ error: '请先导入排练室、乐队和课程数据' });
      return;
    }

    const bookings = generateBookings(rooms, bands, courses, sources);
    saveToStore('bookings', bookings);
    set({ bookings, error: null });

    const useConflictStore = getConflictStore();
    useConflictStore.getState().detectConflicts();
  },

  changeRoom: (bookingId, newRoomId, remark = '手动调整') => {
    const { bookings } = get();
    const useDataStore = getDataStore();
    const { rooms } = useDataStore.getState();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const { booking: updatedBooking, history } = changeBookingRoom(
      booking,
      newRoomId,
      rooms,
      'current_user',
      remark,
    );

    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? updatedBooking : b,
    );

    saveSingleToStore('bookings', updatedBooking);
    
    const useHistoryStore = getHistoryStore();
    useHistoryStore.getState().addHistory(history);

    set({ bookings: updatedBookings });
    
    const useConflictStore = getConflictStore();
    useConflictStore.getState().detectConflicts();
  },

  adjustTime: (bookingId, newStart, newEnd, remark = '手动调整') => {
    const { bookings } = get();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const { booking: updatedBooking, history } = adjustBookingTime(
      booking,
      newStart,
      newEnd,
      'current_user',
      remark,
    );

    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? updatedBooking : b,
    );

    saveSingleToStore('bookings', updatedBooking);
    
    const useHistoryStore = getHistoryStore();
    useHistoryStore.getState().addHistory(history);

    set({ bookings: updatedBookings });
    
    const useConflictStore = getConflictStore();
    useConflictStore.getState().detectConflicts();
  },

  resolveConflict: (bookingId, solution) => {
    const { bookings } = get();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const { booking: updatedBooking, history } = resolveBookingConflict(
      booking,
      solution,
      'current_user',
    );

    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? updatedBooking : b,
    );

    saveSingleToStore('bookings', updatedBooking);
    
    const useHistoryStore = getHistoryStore();
    useHistoryStore.getState().addHistory(history);

    set({ bookings: updatedBookings });
  },

  getBookingById: (id) => {
    return get().bookings.find(b => b.id === id);
  },

  getBookingChain: (id) => {
    const booking = get().bookings.find(b => b.id === id);
    return booking?.dataChain || [];
  },

  updateBookings: (bookings) => {
    saveToStore('bookings', bookings);
    set({ bookings });
  },

  addConflictDetectNode: (bookingId, conflictCount) => {
    const { bookings } = get();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const chainNode = createConflictDetectChainNode(
      { bookingId, conflictCount },
      conflictCount,
    );

    const updatedBooking = addChainNode(booking, chainNode);
    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? updatedBooking : b,
    );

    saveSingleToStore('bookings', updatedBooking);
    set({ bookings: updatedBookings });
  },
}));

registerStore('booking', useBookingStore);
