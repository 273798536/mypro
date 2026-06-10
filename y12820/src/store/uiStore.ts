import { create } from 'zustand';
import { SampleStatus } from '../types';

interface UIState {
  sidebarCollapsed: boolean;
  currentView: 'standard' | 'student';
  selectedSampleId: string | null;
  showBarcodeConflictModal: boolean;
  conflictModalData: unknown | null;
  notification: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null;

  toggleSidebar: () => void;
  setCurrentView: (view: 'standard' | 'student') => void;
  setSelectedSampleId: (id: string | null) => void;
  openConflictModal: (data: unknown) => void;
  closeConflictModal: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  hideNotification: () => void;
  getStatusColor: (status: SampleStatus) => string;
  getStatusBgColor: (status: SampleStatus) => string;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  currentView: 'standard',
  selectedSampleId: null,
  showBarcodeConflictModal: false,
  conflictModalData: null,
  notification: null,

  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setCurrentView: (view) => {
    set({ currentView: view });
  },

  setSelectedSampleId: (id) => {
    set({ selectedSampleId: id });
  },

  openConflictModal: (data) => {
    set({ showBarcodeConflictModal: true, conflictModalData: data });
  },

  closeConflictModal: () => {
    set({ showBarcodeConflictModal: false, conflictModalData: null });
  },

  showNotification: (type, message) => {
    set({
      notification: { show: true, type, message },
    });
    setTimeout(() => {
      set({ notification: null });
    }, 5000);
  },

  hideNotification: () => {
    set({ notification: null });
  },

  getStatusColor: (status) => {
    switch (status) {
      case SampleStatus.AVAILABLE:
        return 'text-quality-green';
      case SampleStatus.REVIEWING:
        return 'text-quality-yellow';
      case SampleStatus.INVALID:
        return 'text-quality-red';
      default:
        return 'text-gray-500';
    }
  },

  getStatusBgColor: (status) => {
    switch (status) {
      case SampleStatus.AVAILABLE:
        return 'bg-quality-green/10 border-quality-green/30';
      case SampleStatus.REVIEWING:
        return 'bg-quality-yellow/10 border-quality-yellow/30';
      case SampleStatus.INVALID:
        return 'bg-quality-red/10 border-quality-red/30';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  },
}));
