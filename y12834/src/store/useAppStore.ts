import { create } from 'zustand';
import type { AppRole } from '../types';
import { getAppSettings, setAppSettings } from '../utils/storage';

interface AppState {
  currentRole: AppRole;
  selectedRunId: string | null;
  setCurrentRole: (role: AppRole) => void;
  setSelectedRunId: (id: string | null) => void;
}

const initialSettings = getAppSettings();

export const useAppStore = create<AppState>((set) => ({
  currentRole: initialSettings.current_role,
  selectedRunId: initialSettings.selected_run_id,

  setCurrentRole: (role) =>
    set((state) => {
      const newSettings = {
        current_role: role,
        selected_run_id: state.selectedRunId,
      };
      setAppSettings(newSettings);
      return { currentRole: role };
    }),

  setSelectedRunId: (id) =>
    set((state) => {
      const newSettings = {
        current_role: state.currentRole,
        selected_run_id: id,
      };
      setAppSettings(newSettings);
      return { selectedRunId: id };
    }),
}));
